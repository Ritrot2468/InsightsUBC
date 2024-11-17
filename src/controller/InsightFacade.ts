import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import fs from "fs-extra";
import DatasetValidatorHelper from "./DatasetValidatorHelper";
import QueryEngine from "./QueryEngine";
import SectionDiskReader from "./sections/SectionDiskReader";
import SectionDiskWriter from "./sections/SectionDiskWriter";
import Section from "./sections/Section";
import RoomDiskReader from "./rooms/RoomDiskReader";
import RoomDiskWriter from "./rooms/RoomDiskWriter";
import Room from "./rooms/Room";
import AddSectionDataset from "./sections/addSectionDataset";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	// tracks all sections added from a dataset using their associated id as the key
	public sectionsDatabase: Map<string, Section[]>;
	public roomsDatabase: Map<string, Room[]>;

	// service classes
	private datasetValidatorHelper: DatasetValidatorHelper;
	private qe: QueryEngine;
	private secDiskReader: SectionDiskReader;
	private secDiskWriter: SectionDiskWriter;
	private roomDiskReader: RoomDiskReader;
	private roomDiskWriter: RoomDiskWriter;
	private sectionHelper: AddSectionDataset;

	constructor() {
		//Log.info("InsightFacadeImpl::init()");
		this.sectionsDatabase = new Map<string, []>();
		this.roomsDatabase = new Map<string, Room[]>();
		this.datasetValidatorHelper = new DatasetValidatorHelper();
		this.qe = new QueryEngine(this.sectionsDatabase, this.roomsDatabase);
		this.secDiskReader = new SectionDiskReader();
		this.secDiskWriter = new SectionDiskWriter();
		this.roomDiskReader = new RoomDiskReader();
		this.roomDiskWriter = new RoomDiskWriter();

		this.sectionHelper = new AddSectionDataset();
		// initialize dictionary for the fields
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		try {
			await this.datasetValidatorHelper.validateIdStructure(id);
			await this.datasetValidatorHelper.validateSectionAddition(id, this.sectionsDatabase, this.roomsDatabase);

			if (kind === InsightDatasetKind.Sections) {
				return this.sectionHelper.addCourses(id, this.sectionsDatabase, content, kind);
			} else {
				await this.roomDiskWriter.logRoomsDatasetOnDisk(content, id, this.roomsDatabase);
				return fs.readdir("./data");
			}
		} catch (err) {
			if (err instanceof InsightError) {
				throw err;
			}
			throw new InsightError(`An unexpected error occurred: ${err}`);
		}
	}

	public async removeDataset(id: string): Promise<string> {
		try {
			await this.datasetValidatorHelper.validateIdStructure(id);
			const datasetPath = `./data/${id}`;
			if (!(await fs.pathExists(datasetPath))) {
				throw new NotFoundError(`Dataset with id ${id} not found.`);
			}

			if (this.sectionsDatabase.get(id)) {
				this.sectionsDatabase.delete(id);
			} else {
				this.roomsDatabase.delete(id);
			}

			await fs.remove(`./data/${id}`);

			// return id name of set currently removed
			return id;
		} catch (err) {
			if (err instanceof InsightError) {
				throw new InsightError("");
			}

			if (err instanceof NotFoundError) {
				throw new NotFoundError("Not found");
			}
			// Handle unexpected errors
			throw new InsightError("An unexpected error occurred ${err.message}");
		}
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		let result: InsightResult[] = [];
		try {
			const currIDs = await fs.readdir("./data");
			//console.log(currIDs)
			const idRecords = await this.datasetValidatorHelper.separateRoomAndCourseIDs(currIDs);
			//console.log(idRecords.rooms, idRecords.courses)

			if (this.sectionsDatabase.size + this.roomsDatabase.size < currIDs.length) {
				const cIDs = idRecords.sections;
				const rIDs = idRecords.rooms;
				//console.log(rIDs)
				this.sectionsDatabase = await this.secDiskReader.mapMissingSections(cIDs, this.sectionsDatabase);
				//console.log((this.sectionsDatabase.keys))
				this.roomsDatabase = await this.roomDiskReader.mapMissingRooms(rIDs, this.roomsDatabase);
			}
			//console.log(currIDs);
			// on query, passes updated sectionsDatabase and roomsDatabase
			result = await this.qe.query(query, this.sectionsDatabase, this.roomsDatabase);
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			} else {
				throw new InsightError("Unexpected error.");
			}
		}
		return result;
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		const directoryExists = await fs.pathExists("./data");
		if (!directoryExists) {
			return [];
		}
		const currIDs = await fs.readdir("./data");

		return this.secDiskReader.logInsightKindFromDisk(currIDs);

		//console.log("currIDs:", currIDs);

		// reads their content info on disk and parses into InsightDataset[](works for rooms as well)
	}
}
