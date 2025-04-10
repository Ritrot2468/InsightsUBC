import Room, { Mfield, Sfield } from "../rooms/Room";
import JSZip from "jszip";
import Building from "./Building";
import * as parse5 from "parse5";
import { InsightError } from "../IInsightFacade";
import * as http from "node:http";

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
	private buildingTdClassNames: string[] = [
		"views-field views-field-field-building-code",
		"views-field views-field-title",
		"views-field views-field-field-building-address",
		"views-field views-field-nothing",
	];
	// parses through index.htm file to return a map with associated populated fields of all buildings in the file
	protected async parseIndexFile(zip: JSZip): Promise<Map<string, Building>> {
		if (!zip.files["index.htm"]) {
			throw new InsightError("index.htm not found");
		}

		const content = await zip.files["index.htm"].async("string");
		const document = parse5.parse(content);
		const buildingsMap = await this.findTdElemsInIndexFile(document);

		return buildingsMap;
	}

	private async getAllTables(doc: any): Promise<any[]> {
		const tables: any[] = [];
		const traverse = (node: any): void => {
			// Check if the current node is a <table>
			if (node.nodeName === "table") {
				tables.push(node); // Add the table to the list
			}

			if (node.childNodes) {
				node.childNodes.forEach((child: any) => traverse(child));
			}
		};

		traverse(doc);
		return tables;
	}

	protected async findTdElemsInIndexFile(doc: any): Promise<Map<string, Building>> {
		const buildingsMap = new Map<string, Building>();
		const tables = await this.getAllTables(doc);
		let foundTable = false;

		const tablePromises = tables.map(async (table: any) => {
			if (foundTable) {
				return;
			}

			const tbody = this.findTbodyInTable(table);
			if (tbody) {
				const result = await this.processTableBody(tbody, buildingsMap);
				if (result) {
					foundTable = true; // Update foundTable if a valid building was found
				}
			}
		});

		await Promise.all(tablePromises);
		if (buildingsMap.size === 0) {
			throw new InsightError("No <td> elements found or valid buildings detected.");
		}

		return buildingsMap;
	}

	private findTbodyInTable(table: any): any | undefined {
		return table.childNodes.find((child: any) => child.nodeName === "tbody");
	}

	private async processTableBody(tbody: any, buildingsMap: Map<string, Building>): Promise<boolean> {
		let validTable = false;
		for (const child of tbody.childNodes) {
			if (child.nodeName === "tr") {
				const validBuilding = this.processTableRow(child);
				if (validBuilding) {
					buildingsMap.set(validBuilding.code, validBuilding.building);
					validTable = true;
				}
			}
		}
		return validTable; // no valid building found in this tbody -> not a valid table
	}

	private processTableRow(row: any): { code: string; building: Building } | null {
		const currClassNames: string[] = [];
		const tdElems = row.childNodes.filter((grandchild: any) => grandchild.nodeName === "td");

		tdElems.forEach((tdElem: any) => {
			const classAttr = tdElem.attrs.find((attr: any) => attr.name === "class");
			const classList = classAttr ? classAttr.value : "";
			currClassNames.push(classList);
		});

		if (this.compareClassNames(this.buildingTdClassNames, currClassNames)) {
			// console.log("reqClass: ", this.buildingTdClassNames)
			// console.log("currClass: ", currClassNames)

			const newBuilding: Building = this.parseBuildingInfo(tdElems);
			const codeKey: string[] = newBuilding.getbHref().split("/");

			const buildingCode: string = codeKey[codeKey.length - 1].split(".")[0];
			//console.log(buildingCode)

			return { code: buildingCode, building: newBuilding };
		}

		return null;
	}

	protected async parseRoomInfo(tdElems: any, building: Building, id: string): Promise<Room | null> {
		let number = "";
		let seats = 0;
		let type = "";
		let furniture = "";
		let href = "";
		// Extract room information from tdElems
		const roomInfo = this.findElementInfo(tdElems, number, seats, href, furniture, type);
		({ href, number, seats, furniture, type } = roomInfo);
		const name = `${building.getShortname()}_${number}`;
		try {
			// Fetch geolocation data
			const geoLoc = await this.fetchGeoLocation(building.getAddress());
			// Ensure both lat and lon are present
			if (geoLoc && typeof geoLoc.lat === "number" && typeof geoLoc.lon === "number") {
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
					href: href,
				};

				return new Room(id, roomMfields, roomSfields, building);
			}
			return null;
		} catch (error) {
			if (error) {
				return null;
			}
			return null;
		}
	}

	private findElementInfo(
		tdElems: any,
		number: string,
		seats: number,
		href: string,
		furniture: string,
		type: string
	): { number: string; seats: number; href: string; furniture: string; type: string } {
		tdElems.forEach((tdElem: any): any => {
			const classAttr = tdElem.attrs.find((attr: any) => attr.name === "class");
			const className = classAttr ? classAttr.value : "";

			const anchor = tdElem.childNodes.find((node: any) => node.nodeName === "a");
			switch (className) {
				case "views-field views-field-field-room-number":
					number = this.processNodeValue(anchor);
					break;
				case "views-field views-field-field-room-capacity":
					seats = this.processNodeValue(tdElem);
					//console.log(seats)
					break;
				case "views-field views-field-field-room-furniture":
					furniture = this.processNodeValue(tdElem);
					break;
				case "views-field views-field-field-room-type":
					type = this.processNodeValue(tdElem);
					break;
				case "views-field views-field-nothing":
					href = anchor.attrs.find((attr: any) => attr.name === "href")?.value || "";
					break;
				default:
					throw new InsightError("Not a valid building table cell");
			}
		});
		return { number, seats, href, furniture, type };
	}

	protected compareClassNames(arr1: any[], arr2: any[]): boolean {
		return arr1.every((value) => arr2.includes(value));
	}

	protected processNodeValue(tdElem: any): any {
		return tdElem.childNodes
			.map((node: any) => node.value)
			.join("")
			.trim();
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

			switch (className) {
				case "views-field views-field-field-building-code":
					shortname = this.processNodeValue(tdElem);
					break;
				case "views-field views-field-title":
					fullname = this.processNodeValue(anchor);
					href = anchor.attrs.find((attr: any) => attr.name === "href")?.value || "";
					break;
				case "views-field views-field-field-building-address":
					address = this.processNodeValue(tdElem);
					break;
				case "views-field views-field-nothing":
					break;
				default:
					throw new InsightError("Not a valid building table cell");
			}
		});

		// Create and return a new Building instance
		return new Building({ fullname, shortname, address, href });
	}

	protected async fetchGeoLocation(address: string): Promise<Geolocation> {
		const encodedAddress = encodeURIComponent(address);
		const url = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team${this.TEAM_NUMBER}/${encodedAddress}`;
		// based on https://nodejs.org/api/http.html#http_http implementation of 'http.get(url[, options][, callback])'
		return new Promise<Geolocation>((resolve, reject) => {
			http
				.get(url, (res) => {
					let error;
					const errorCode = 200;
					if (res.statusCode !== errorCode) {
						error = new Error(`Request Failed.\nStatus Code: ${res.statusCode}`);
					}
					if (error) {
						res.resume();
						reject(error);
					}

					let rawData = "";
					res.on("data", (chunk) => {
						rawData += chunk;
					});
					res.on("end", () => {
						this.fetchResponse(rawData, resolve, reject);
					});
				})
				.on("error", (e) => {
					reject(e);
				});
		});
	}

	private fetchResponse(
		rawData: string,
		resolve: (value: PromiseLike<Geolocation> | Geolocation) => void,
		reject: (reason?: any) => void
	): any {
		try {
			const response: GeoResponse = JSON.parse(rawData);
			if (response.lat !== undefined && response.lon !== undefined) {
				resolve({ lat: response.lat, lon: response.lon });
			} else {
				reject(new Error());
			}
		} catch (err) {
			reject(err);
		}
	}
}
