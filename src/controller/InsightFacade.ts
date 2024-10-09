import Section, {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import fs from "fs-extra";
import SectionsValidator from "./SectionsValidator";
import SectionsParser from "./SectionsParser";
import QueryEngine from "./QueryEngine";
import DiskReader from "./DiskReader";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	// map to track record
	//private datasets: Map<string, InsightResult>;

	// tracks all sections added from a dataset using their associated id as the key
	public sectionsDatabase: Map<string, Section[]>;

	// list of name of current IDs added
	//private currIDs: string[];

	// service classes
	private sv: SectionsValidator;
	private sp: SectionsParser;
	private qe: QueryEngine;
	private dr: DiskReader;

	constructor() {
		//Log.info("InsightFacadeImpl::init()");
		this.sectionsDatabase = new Map<string, []>();
		//this.currIDs = [];
		this.sv = new SectionsValidator();
		this.sp = new SectionsParser();
		this.qe = new QueryEngine(this.sectionsDatabase);
		this.dr = new DiskReader(this.sectionsDatabase);
		// initialize dictionary for the fields
	}
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		try {
			await Promise.all([
				this.sv.validateId(id),
				this.sp.logDatasetOnDisk(content, id),
			]);

			await this.logNewDatasetFromDiskToMap(id);
			await this.sp.logInsightKindToDisk(id, kind, this.sectionsDatabase.get(id)?.length as number);

			// Resolve with the dataset ID
			return fs.readdir("./data");
		} catch (err) {
			if (err instanceof InsightError) {
				throw err;
			}
			throw new InsightError(`An unexpected error occurred: ${err}`);
		}
	}

	// REQUIRES: id - name of dataset to be retrieved from disk (id IS NOT IN datasets ALREADY!!!!)
	//           datasets - sets you'll be mapping new DatasetRecord to
	// EFFECTS: Retrieves the sections associated with the dataset id on disk and turned into Sections objects and maps
	//          them to sectionsDatabase with their associated id.
	// OUTPUT: VOID
	public async logNewDatasetFromDiskToMap(id: string): Promise<void> {
		const newDataset = await this.sp.turnDatasetToSection(id);
		const numRows = newDataset.sections.length;

		if (numRows === 0) {
			throw new InsightError("No valid Section");
		}
		// update member variables
		this.sectionsDatabase.set(newDataset.id, newDataset.sections);
	}

	public async removeDataset(id: string): Promise<string> {
		try {
			await this.sv.validateIdRemoval(id);
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

	/*
	public async performQuery(query: unknown): Promise<InsightResult[]> {
		return Promise.reject("Not implemented.");
	}
	*/

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		let result: InsightResult[] = [];
		try {
			const currIDs = await fs.readdir("./data");

			if (this.sectionsDatabase.size !== currIDs.length) {
				this.sectionsDatabase = await this.dr.mapMissingSections(currIDs)
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
		const currIDs = await fs.readdir("./data")

		// reads their content info on disk and parses into InsightDataset[]
		return this.sp.logInsightKindFromDisk(currIDs)
	}
}
