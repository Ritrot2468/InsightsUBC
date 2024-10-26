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

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	// tracks all sections added from a dataset using their associated id as the key
	public sectionsDatabase: Map<string, Section[]>;

	// service classes
	private sv: DatasetValidatorHelper;
	private qe: QueryEngine;
	private secDiskReader: SectionDiskReader;
	private secDiskWriter: SectionDiskWriter;
	private roomDiskReader: RoomDiskReader;
	private roomDiskWriter: RoomDiskWriter;

	constructor() {
		//Log.info("InsightFacadeImpl::init()");
		this.sectionsDatabase = new Map<string, []>();
		this.sv = new DatasetValidatorHelper();
		this.qe = new QueryEngine(this.sectionsDatabase);
		this.secDiskReader = new SectionDiskReader();
		this.secDiskWriter = new SectionDiskWriter();
		this.roomDiskReader = new RoomDiskReader();
		this.roomDiskWriter = new RoomDiskWriter();
		// initialize dictionary for the fields
	}
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		try {
			await this.sv.validateIdStructure(id);

			//if (kind === InsightDatasetKind.Sections) {
			await this.sv.validateSectionAddition(id, this.sectionsDatabase);
			await this.secDiskWriter.logSectionsDatasetOnDisk(content, id);
			await this.secDiskReader.logNewDatasetFromDiskToMap(id, this.sectionsDatabase);
			await this.secDiskWriter.logInsightKindToDisk(id, kind, this.sectionsDatabase.get(id)?.length as number);

			return fs.readdir("./data");
			//
			// } else {
			// 	this.roomDiskWriter.logRoomsDatasetOnDisk(content, id);
			// 	return fs.readdir("");
			// }
		} catch (err) {
			if (err instanceof InsightError) {
				throw err;
			}
			throw new InsightError(`An unexpected error occurred: ${err}`);
		}
	}

	// // REQUIRES: id - name of dataset to be retrieved from disk (id IS NOT IN datasets ALREADY!!!!)
	// //           datasets - sets you'll be mapping new DatasetRecord to
	// // EFFECTS: Retrieves the sections associated with the dataset id on disk and turned into Sections objects and maps
	// //          them to sectionsDatabase with their associated id.
	// // OUTPUT: VOID
	// public async logNewDatasetFromDiskToMap(id: string): Promise<void> {
	// 	const newDataset = await this.sp.turnDatasetToSection(id);
	// 	const numRows = newDataset.sections.length;
	//
	// 	if (numRows === 0) {
	// 		throw new InsightError("No valid Section");
	// 	}
	// 	// update member variables
	// 	this.sectionsDatabase.set(newDataset.id, newDataset.sections);
	// }

	public async removeDataset(id: string): Promise<string> {
		try {
			await this.sv.validateIdStructure(id);
			const datasetPath = `./data/${id}`;
			if (!(await fs.pathExists(datasetPath))) {
				throw new NotFoundError(`Dataset with id ${id} not found.`);
			}

			this.sectionsDatabase.delete(id);

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

			if (this.sectionsDatabase.size !== currIDs.length) {
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

		// reads their content info on disk and parses into InsightDataset[]
		return this.secDiskReader.logInsightKindFromDisk(currIDs);
	}
}
