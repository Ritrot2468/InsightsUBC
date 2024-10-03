import Section, {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import fs from "fs-extra";
import SectionsValidator from "./SectionsValidator";
import SectionsParser from "./SectionsParser";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	// map to track record
	private readonly datasets: Map<string, InsightResult>;

	// tracks all sections added from a dataset using their associated id as the key
	private readonly sectionsDatabase: Map<string, Section[]>;

	// list of name of current IDs added
	private currIDs: string[];
	private sv: SectionsValidator;
	private sp: SectionsParser;
	// TODO: find out if dataset was the same but diff ID if it can be added

	constructor() {
		//Log.info("InsightFacadeImpl::init()");
		this.datasets = new Map<string, InsightResult>();
		this.sectionsDatabase = new Map<string, []>();
		this.currIDs = [];
		this.sv = new SectionsValidator();
		this.sp = new SectionsParser();
		// initialize dictionary for the fields
	}
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		try {
			this.sv.validateId(id, this.currIDs);
			// Number of rows found associated with the insightKind
			const numRows = await this.sp.countRows(content, id, this.sectionsDatabase);
			//console.log(numRows)

			// Create an InsightResult record
			const newRecord: InsightResult = {
				[kind]: numRows,
			};

			// Store the dataset
			this.datasets.set(id, newRecord);
			this.currIDs.push(id);

			// Resolve with the dataset ID
			return this.currIDs;
		} catch (err) {
			if (err instanceof InsightError) {
				throw err;
			} else {
				throw new InsightError(`An unexpected error occurred: ${err}`);
			}
		}
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

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::performQuery() is unimplemented! - query=${query};`);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		return new Promise((resolve) => {
			const result: InsightDataset[] = [];

			this.datasets.forEach((val, key) => {
				const newInsightDataset: InsightDataset = {
					id: key,
					// So far since adding dataset with the same ID twice is not allowed ******
					kind: Object.keys(val)[0] as InsightDatasetKind,
					numRows: val[Object.keys(val)[0]] as number,
				};

				result.push(newInsightDataset);
			});
			resolve(result);
		});
	}
}
