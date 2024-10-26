import Room, {Mfield, Sfield} from "../rooms/Room";
import JSZip from "jszip";
import Building from "./Building";
import * as parse5 from "parse5";
import {InsightError} from "../IInsightFacade";
import * as http from "node:http";
import Section from "../sections/Section";

export default interface GeoResponse {
	lat?: number;
	lon?: number;
	error?: string;
}

export interface DatasetRecord {
	id: string;
	rooms: Room[];
}

interface Geolocation {
	lat: number;
	lon: number;
}

export default class RoomsParser {

	private TEAM_NUMBER = 59;
	// parses through index.htm file to return a map with associated populated fields of all buildings in the file
	protected async parseIndexFile(zip: JSZip): Promise<Map<string, Building>> {
		const allPromises: Promise<Map<string, Building>>[] = [];

		for (const key in zip.files) {
			if (key === "campus/index.htm") {
				const promiseContent = zip.files[key].async("string").then((content0) => {
					const document = parse5.parse(content0);
					const buildingTdClassNames: string[] = [];
					return this.findTdElemsInIndexFile(document, buildingTdClassNames);
				});
				allPromises.push(promiseContent);
			}
		}

		// wait for all promises
		const results = await Promise.all(allPromises);
		const combinedMap = new Map<string, Building>();

		// combine all maps
		results.forEach((buildingMap) => {
			buildingMap.forEach((building, shortname) => {
				combinedMap.set(shortname, building);
			});
		});

		return combinedMap;
	}

	// finds all the td elems associated with the index table of
	protected findTdElemsInIndexFile(doc: any, classNames: string[]): Map<string, Building> {
		const buildingsMap = new Map<string, Building>();
		// Function to traverse the parsed tree
		const traverse = (node: any) => {
			// Check if the current node is a <tr> element
			const currClassNames: string[] = [];
			if (node.nodeName === "tr" && node.childNodes) {
				// Gather all <td> elements within this <tr>
				const tdElems = node.childNodes.filter((child: any) => child.nodeName === "td");
				//console.log(tdElems)

				// Process each <td> element
				tdElems.forEach((tdElem: any) => {
					const classAttr = tdElem.attrs.find((attr: any) => attr.name === "class");
					//console.log(classAttr)
					const classList = classAttr ? classAttr.value : "";
					if (classList != "") {
						currClassNames.push(classList);
					}
				});

				if (classNames.length === 0) {
					classNames = currClassNames;
				} else {
					//console.log("classNames: ", classNames)
					//console.log("currClassNames: ", currClassNames)
					if (this.compareClassNames(classNames, currClassNames)) {
						const newBuilding: Building = this.parseBuildingInfo(tdElems);

						buildingsMap.set(newBuilding.getShortname(), newBuilding);
						//console.log(newBuilding.getShortname())
					}
				}
			}

			// Recursively traverse child nodes
			if (node.childNodes) {
				node.childNodes.forEach((child: any) => traverse(child));
			}
		};

		traverse(doc); // Start traversing from the root document

		//console.log(buildingsMap.size)

		if (buildingsMap.size === 0) {
			throw new InsightError("No <td> elements found or valid buildings detected.");
		}

		return buildingsMap;
	}

	protected async parseRoomInfo(tdElems: any, building: Building, id: string): Promise<Room | null> {
		let number = "";
		let seats = 0;
		let type = "";
		let furniture = "";

		// Extract room information from tdElems
		const __ret = this.findElementInfo(tdElems, number, seats, furniture, type);
		number = __ret.number;
		seats = __ret.seats;
		furniture = __ret.furniture;
		type = __ret.type;

		const name = `${building.getShortname()}_${number}`;

		try {
			// Fetch geolocation data
			const geoLoc = await this.fetchGeoLocation(building.getAddress());

			// Ensure both lat and lon are present
			if (geoLoc && typeof geoLoc.lat === 'number' && typeof geoLoc.lon === 'number') {
				const roomMfields: Mfield = {
					lat: geoLoc.lat,
					lon: geoLoc.lon,
					seats: seats,
				};

				// Define the Sfield object
				const roomSfields: Partial<Sfield> = {
					number: number,
					name: name,
					type: type,
					furniture: furniture,
				};

				// Create and return a new Room instance
				return new Room(id, roomMfields, roomSfields, building);
			} else {
				return null;
			}
		} catch (error) {
			return null
		}
	}

	private findElementInfo(tdElems: any, number: string, seats: number, furniture: string, type: string) {
		tdElems.forEach((tdElem: any) => {
			const classAttr = tdElem.attrs.find((attr: any) => attr.name === "class");
			const className = classAttr ? classAttr.value : "";

			const anchor = tdElem.childNodes.find((node: any) => node.nodeName === "a");
			//console.log(anchor)
			//console.log(className)
			switch (className) {
				case "views-field views-field-field-room-number":
					number = anchor.childNodes
						.map((node: any) => node.value)
						.join("")
						.trim();
					//console.log(number)
					break;
				case "views-field views-field-field-room-capacity":
					seats = tdElem.childNodes
						.map((node: any) => node.value)
						.join("")
						.trim();
					//console.log(seats)
					break;
				case "views-field views-field-field-room-furniture":
					furniture = tdElem.childNodes
						.map((node: any) => node.value)
						.join("")
						.trim();

					//console.log(furniture)
					break;
				case "views-field views-field-field-room-type":
					type = tdElem.childNodes
						.map((node: any) => node.value)
						.join("")
						.trim();

					//console.log(type)
					break;
				case "views-field views-field-nothing":
					break;
				default:
					throw new InsightError("Not a valid building table cell");
			}
		});
		return {number, seats, furniture, type};
	}

	protected compareClassNames(arr1: any[], arr2: any[]): boolean {
		return arr1.length === arr2.length && arr1.every((value) => arr2.includes(value));
	}

	protected parseBuildingInfo(tdElems: any): Building {
		// Extract the anchor element within the <td>
		//console.log(tdElems[0].attr)
		let fullname = "";
		let shortname = "";
		let address = "";
		let href = "";

		tdElems.forEach((tdElem: any) => {
			const classAttr = tdElem.attrs.find((attr: any) => attr.name === "class");
			const className = classAttr ? classAttr.value : "";

			if (className === "views-field views-field-field-building-image") {
				return; // SKIP
			}
			const anchor = tdElem.childNodes.find((node: any) => node.nodeName === "a");
			//console.log(anchor)
			//console.log(className)
			switch (className) {
				case "views-field views-field-field-building-code":
					shortname = tdElem.childNodes
						.map((node: any) => node.value)
						.join("")
						.trim();
					//console.log(shortname)
					break;
				case "views-field views-field-title":
					fullname = anchor.childNodes
						.map((node: any) => node.value)
						.join("")
						.trim();
					//console.log(fullname)
					break;
				case "views-field views-field-field-building-address":
					address = tdElem.childNodes
						.map((node: any) => node.value)
						.join("")
						.trim();

					//console.log(address)
					break;
				case "views-field views-field-nothing":
					href = anchor.attrs.find((attr: any) => attr.name === "href")?.value || "";
					//console.log(href)
					break;
				default:
					throw new InsightError("Not a valid building table cell");
			}
		});

		// Create and return a new Building instance
		return new Building({ fullname, shortname, address, href });
	}


	protected async fetchGeoLocation (address: string): Promise< Geolocation> {
		const encodedAddress = encodeURIComponent(address)
		const url = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team${this.TEAM_NUMBER}/${encodedAddress}`;

		//console.log(`Request URL: ${url}`);

		return new Promise<Geolocation>((resolve, reject) => {
			http.get(url, (res) => {

				let error;
				if (res.statusCode !== 200) {
					error = new Error(`Request Failed.\nStatus Code: ${res.statusCode}`);
				}
				if (error) {
					res.resume();
					return;
				}

				let rawData = '';
				res.on('data', (chunk) => { rawData += chunk; });
				res.on('end', () => {
					try {
						const response: GeoResponse = JSON.parse(rawData);
						//console.log(`Response : ${rawData}`);

						if (response.lat !== undefined && response.lon !== undefined) {
							//console.log(`Geolocation found: lat=${response.lat}, lon=${response.lon}`);
							resolve({ lat: response.lat, lon: response.lon });
						} else {
							reject( new Error())
						}
					} catch (err) {
						reject(err);
					}
				});
			}).on('error', (e) => {
				console.log(`Request error: ${e.message}`);
				reject(e);
			});
		});

	}


}
