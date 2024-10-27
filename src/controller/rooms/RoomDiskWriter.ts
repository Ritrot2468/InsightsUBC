import JSZip from "jszip";
import RoomsParser from "./RoomsParser";
import * as parse5 from "parse5";
import { InsightDatasetKind, InsightError } from "../IInsightFacade";
import Building from "./Building";
import Room from "./Room";
import fs from "fs-extra";

export default class RoomDiskWriter extends RoomsParser {
	//Every SectionDiskWriter needs to be able to parse sections using SectionsParser

	private roomTdClassNames: string[] = [
		"views-field views-field-field-room-number",
		"views-field views-field-field-room-capacity",
		"views-field views-field-field-room-furniture",
		"views-field views-field-field-room-type",
		"views-field views-field-nothing",
	];
	constructor() {
		super();
	}

	public async logRoomsDatasetOnDisk(content: string, id: string, roomMap: Map<string, Room[]>): Promise<void> {
		const buffer = Buffer.from(content, "base64");
		const zip = await JSZip.loadAsync(buffer);
		await this.logRoomDatasetAndMap(zip, id, roomMap);
	}

	// writes room dataset info onto disk
	private async logRoomDatasetAndMap(zip: JSZip, id: string, roomMap: Map<string, Room[]>): Promise<void> {
		let buildingMap: Map<string, Building> = new Map<string, Building>();
		buildingMap = await this.parseIndexFile(zip);
		const newRooms = await this.logAllRoomFilesOnDisk(zip, buildingMap, id);
		roomMap.set(id, newRooms);
	}
	protected async logAllRoomFilesOnDisk(zip: JSZip, buildingMap: Map<string, Building>, id: string): Promise<Room[]> {
		const allPromises: Promise<Room[]>[] = [];
		const dirs = Array.from(buildingMap.keys());
		let numRows = 0;
		//console.log(dirs)

		const folder = zip.folder("campus/discover/buildings-and-classrooms");
		if (!folder) {
			throw new Error("Folder not found in zip file");
		}
		folder.forEach((relativePath, file) => {
			const buildingCode = relativePath.split(".")[0]; // Extract dir or file name
			//console.log(buildingCode)
			if (dirs.includes(buildingCode)) {
				//console.log("File object:", file);

				const promiseContent = file.async("text").then(async (content0) => {
					const document = parse5.parse(content0);
					const building: Building = buildingMap.get(buildingCode) as Building;
					return this.findTdElemsOfRooms(document, building, id);
				});
				allPromises.push(promiseContent);
			}
		});
		const roomArrays = await Promise.all(allPromises);
		const allRooms: Room[] = [];
		roomArrays.forEach((rooms) => {
			if (rooms.length > 0) {
				allRooms.push(...rooms);
			}
		});
		numRows = allRooms.length;
		if (numRows === 0) {
			throw new InsightError("No valid rooms");
		}
		//console.log(numRows)
		await this.storeRoomsOnDisk(allRooms, id);

		await this.logRoomInsightKindToDisk(id, InsightDatasetKind.Rooms, numRows);
		return allRooms;
	}

	protected async findTdElemsOfRooms(doc: any, building: Building, id: string): Promise<Room[]> {
		const roomPromises: Promise<Room | null>[] = [];
		//  traverse the parsed tree
		const traverse = (node: any): any => {
			// check if the current node is a <tr> element
			const currClassNames: string[] = [];
			if (node.nodeName === "tr" && node.childNodes) {
				// Gather all <td> elements within this <tr>
				const tdElems = node.childNodes.filter((child: any) => child.nodeName === "td");
				//console.log(tdElems)

				// Process each <td> element
				tdElems.forEach((tdElem: any) => {
					const classAttr = tdElem.attrs.find((attr: any) => attr.name === "class");
					//console.log(classAttr)
					const classList = classAttr.value;
					currClassNames.push(classList);
				});

				//console.log("classNames: ", classNames)
				//console.log("currClassNames: ", currClassNames)
				if (this.compareClassNames(this.roomTdClassNames, currClassNames)) {
					const newRoom = this.parseRoomInfo(tdElems, building, id);
					roomPromises.push(newRoom);
				}
			}

			// Recursively traverse child nodes
			if (node.childNodes) {
				node.childNodes.forEach((child: any) => traverse(child));
			}
		};

		traverse(doc); // Start traversing from the root document
		const rooms: Room[] = [];
		return Promise.all(roomPromises).then((results) => {
			results.forEach((room) => {
				if (room) {
					rooms.push(room);
				}
			});
			//console.log(rooms.length)
			return rooms;
		});
	}

	// Writes InsightDataset info about a dataset
	public async logRoomInsightKindToDisk(id: string, kind: InsightDatasetKind, numRows: number): Promise<void> {
		const obj = {
			table: [{ id, kind, numRows }],
		};
		//obj.table.push({id: id, kind: kind, numRows: numRows} as never);
		const json = JSON.stringify(obj);
		await fs.outputFile(`./data/${id}/kind`, json);
	}

	protected async storeRoomsOnDisk(rooms: Room[], id: string): Promise<void> {
		const allRoomsPromises = [];
		for (const room of rooms) {
			if (room) {
				const jsonData = room.convertToJSON();
				//console.log(jsonData)
				const roomData = fs.outputJson(`./data/${id}/rooms/${room.getSfields().name}.json`, jsonData);
				allRoomsPromises.push(roomData);
			}
		}
		await Promise.all(allRoomsPromises);
	}
}
