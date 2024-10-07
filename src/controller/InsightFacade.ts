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

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	// map to track record
	private datasets: Map<string, InsightResult>;

	// tracks all sections added from a dataset using their associated id as the key
	public sectionsDatabase: Map<string, Section[]>;

	// list of name of current IDs added
	private currIDs: string[];

	// service classes
	private sv: SectionsValidator;
	private sp: SectionsParser;
	private qe: QueryEngine;

	constructor() {
		//Log.info("InsightFacadeImpl::init()");
		this.datasets = new Map<string, InsightResult>();
		this.sectionsDatabase = new Map<string, []>();
		this.currIDs = [];
		this.sv = new SectionsValidator();
		this.sp = new SectionsParser();
		this.qe = new QueryEngine(this.sectionsDatabase);
		// initialize dictionary for the fields
	}
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		try {
			this.sv.validateId(id, this.currIDs);
			// Number of rows found associated with the insightKind
			//const numRows = await this.sp.countRows(content, id, this.sectionsDatabase);

			await this.sp.logDatasetOnDisk(content, id);
			await this.logNewDatasetFromDiskToMap(id, kind);

			// Resolve with the dataset ID
			return this.currIDs;
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
	//          them to sectionsDatabase with their associated id. Updates the currIDs and database member variables
	// OUTPUT: VOID
	public async logNewDatasetFromDiskToMap(id: string, kind: InsightDatasetKind): Promise<void> {
		const newDataset = await this.sp.turnDatasetToSection(id);
		const numRows = newDataset.sections.length;

		if (numRows === 0) {
			throw new InsightError("No valid Section");
		}
		// Create an InsightResult record
		const newRecord: InsightResult = {
			[kind]: numRows,
		};

		// update member variables
		this.sectionsDatabase.set(newDataset.id, newDataset.sections);
		this.currIDs.push(id);
		this.datasets.set(id, newRecord);
	}

	public async removeDataset(id: string): Promise<string> {
		try {
			this.sv.validateIdRemoval(id, this.currIDs);

			this.currIDs = this.currIDs.filter((currentId) => currentId !== id);
			this.datasets.delete(id);
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
		// console.log(this.datasets.size)
		// this.sectionsDatabase.forEach((key, value) => {
		// 	console.log(key, value)
		// })
		try {
			result = await this.qe.query(query);
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				// this.sectionsDatabase.forEach((key, value) => {
				// 	console.log(key, value)
				// })
				throw err;
			} else {
				throw new InsightError("Unexpected error.");
			}
		}
		return result;
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		const result: any[] = [];

		this.datasets.forEach((val, key) => {
			const newInsightDataset: InsightDataset = {
				id: key,
				// So far since adding dataset with the same ID twice is not allowed ******
				kind: Object.keys(val)[0] as InsightDatasetKind,
				numRows: val[Object.keys(val)[0]] as number,
			};

			result.push(newInsightDataset);
		});
		await Promise.all(result);
		return result;
	}
}
