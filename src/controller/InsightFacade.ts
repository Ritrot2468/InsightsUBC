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
import { getContentFromArchives } from "../../test/TestUtil";
import JSZip from "jszip";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	// map to track record
	private readonly datasets: Map<string, InsightResult>;

	// tracks all sections added from a dataset using their associated id as the key
	public sectionsDatabase: Map<string, Section[]>;

	// list of name of current IDs added
	private currIDs: string[];
	private sv: SectionsValidator;
	private sp: SectionsParser;

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
		this.sectionsDatabase.set(newDataset.id, newDataset.sections);
		const numRows = newDataset.sections.length;
		// Create an InsightResult record
		const newRecord: InsightResult = {
			[kind]: numRows,
		};
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

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::performQuery() is unimplemented! - query=${query};`);
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
