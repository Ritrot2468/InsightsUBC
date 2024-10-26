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
import FacadeSectionFunctions from "./sections/FacadeSectionFunctions";

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
	private sv: DatasetValidatorHelper;
	private qe: QueryEngine;
	private secDiskReader: SectionDiskReader;
	private secDiskWriter: SectionDiskWriter;
	private roomDiskReader: RoomDiskReader;
	private roomDiskWriter: RoomDiskWriter;
	private sectionHelper: FacadeSectionFunctions;

	constructor() {
		//Log.info("InsightFacadeImpl::init()");
		this.sectionsDatabase = new Map<string, []>();
		this.roomsDatabase = new Map<string, Room[]>()
		this.sv = new DatasetValidatorHelper();
		this.qe = new QueryEngine(this.sectionsDatabase);
		this.secDiskReader = new SectionDiskReader();
		this.secDiskWriter = new SectionDiskWriter();
		this.roomDiskReader = new RoomDiskReader();
		this.roomDiskWriter = new RoomDiskWriter();

		this.sectionHelper = new FacadeSectionFunctions();
		// initialize dictionary for the fields
	}
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		try {
			await this.sv.validateIdStructure(id);
			await this.sv.validateSectionAddition(id, this.sectionsDatabase, this.roomsDatabase);

			if (kind === InsightDatasetKind.Sections) {
				//return this.sectionHelper.addRoom(id, this.sectionsDatabase, content, kind)
				await this.secDiskWriter.logSectionsDatasetOnDisk(content, id);
				await this.secDiskReader.logNewDatasetFromDiskToMap(id, this.sectionsDatabase);
				await this.secDiskWriter.logInsightKindToDisk(id, kind, this.sectionsDatabase.get(id)?.length as number);

				return fs.readdir("./data");

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
			await this.sv.validateIdStructure(id);
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

			if ((this.sectionsDatabase.size + this.roomsDatabase.size) !== currIDs.length) {
				this.sectionsDatabase = await this.secDiskReader.mapMissingSections(currIDs, this.sectionsDatabase);
			}

			result = await this.qe.query(query);
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
		// reads the list of dataset ids already on disk

		const currIDs = await fs.readdir("./data");

		// reads their content info on disk and parses into InsightDataset[](works for rooms as well)
		return this.secDiskReader.logInsightKindFromDisk(currIDs);
	}
}
