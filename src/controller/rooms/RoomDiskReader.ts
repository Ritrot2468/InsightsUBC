import RoomsParser from "./RoomsParser";
import {InsightDataset, InsightDatasetKind, InsightError} from "../IInsightFacade";
import fs from "fs-extra";
import Room from "./Room";
import {DatasetRecord} from "../rooms/RoomsParser";

export default class RoomDiskReader extends RoomsParser {
	constructor() {
		super();
	}

	public async logInsightKindFromDisk(ids: string[]): Promise<InsightDataset[]> {
		const allPromises = ids.map(async (id) => {
			const file = await fs.promises.readFile(`./data/${id}/kind`, "utf8");
			const obj = JSON.parse(file);

			const numRows = obj.table[0].numRows as number;
			const kind = obj.table[0].kind as InsightDatasetKind;

			const newInsightDataset: InsightDataset = {
				id: id,
				kind: kind,
				numRows: numRows,
			};

			return newInsightDataset;
		});

		const result = await Promise.all(allPromises);
		return result;
	}

	// REQUIRES: id - name of dataset to be retrieved from disk (id IS NOT IN datasets ALREADY!!!!)
	//           datasets - sets you'll be mapping new DatasetRecord to
	// EFFECTS: Retrieves the sections associated with the dataset id on disk and turned into Sections objects and maps
	//          them to sectionsDatabase with their associated id.
	// OUTPUT: VOID
	public async logNewDatasetFromDiskToMap(id: string, roomsDatabase: Map<string, Room[]>): Promise<void> {
		const newDataset = await this.turnDatasetToRoom(id);
		const numRows = newDataset.rooms.length;

		if (numRows === 0) {
			throw new InsightError("No valid Section");
		}
		// update member variables
		roomsDatabase.set(newDataset.id, newDataset.rooms);
	}


	public async turnDatasetToRoom(id: string): Promise<DatasetRecord> {
			// tracks number of sections in a given dataset and is initialized to 0

			// where each promise is appended to for each course object
			const allPromises: any[] = [];
		const rooms: Room[] = [];

		// list of all courses under the dataset file
		const path = await fs.readdir(`./data/${id}/rooms/`);
		for (const room of path) {
			const promise = fs
				.readJson(`./data/${id}/rooms/${room}`)
				.then(async (file) => {
					// turn room JSON file to Room objects
					const newRoom : Room = Room.fromJSON(file)
					rooms.push(newRoom)
					console.log(newRoom.getID())

					return { id, file };
				})
				.catch((err) => {
					throw err;
				});

			allPromises.push(promise);
		}

		await Promise.all(allPromises);
		const datasetRecord: DatasetRecord = {id: id, rooms: rooms };
		return datasetRecord;
	}

}
