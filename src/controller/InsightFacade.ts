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
		const numRows = newDataset.sections.length;
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

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		return Promise.reject("Not implemented.");
	}

	/*
	public async performQuery(query: unknown): Promise<InsightResult[]> {
		return Promise.reject("Not implemented.");
		return new Promise((resolve) => {
			let filteredSections: Section[] = [];
			let result: InsightResult[] = [];
			const numKeys = 2; // number of keys in query object
			this.queryingIDString = "";
			try {
				const queryObj = Object(query);
				if (Object.keys(queryObj).length > numKeys) {
					throw new InsightError("Excess keys in query");
				}

				// If WHERE key exists, filter all the sections, else throw InsightError
				if ("WHERE" in queryObj) {
					filteredSections = this.handleWHERE(queryObj.WHERE);
				} else {
					throw new InsightError("Query missing WHERE");
				}

				// If OPTIONS key exists, collect InsightResults, else throw InsightError
				if ("OPTIONS" in queryObj) {
					result = this.handleOPTIONS(queryObj.OPTIONS, filteredSections);
				} else {
					throw new InsightError("Query missing OPTIONS");
				}
			} catch (err) {
				if (err instanceof InsightError || err instanceof ResultTooLargeError) {
					throw err;
				} else {
					throw new InsightError("Unexpected error.");
				}
			}
			resolve(result);
		});
	}

	private handleWHERE(where: object): Section[] {
		let filteredSections: Section[] = [];
		this.noFilter = true;
		//console.log(query);
		try {
			if (Object.keys(where).length === 0) {
				return filteredSections;
			} else if (Object.keys(where).length > 1) {
				throw new InsightError("WHERE should only have 1 key");
			} else {
				filteredSections = this.handleFilter(Object.keys(where)[0], Object.values(where)[0]);
			}
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			} else {
				throw new InsightError("Unexpected error.");
			}
		}
		return filteredSections;
	}

	private handleFilter(filter: string, value: unknown): Section[] {
		let results: Section[] = [];
		try {
			if (this.logicComparator.includes(filter)) {
				results = this.handleLogicComparison();
			} else if (this.mComparator.includes(filter)) {
				results = this.handleMComparison();
			} else if (filter === "IS") {
				const valueObj = Object(value);
				results = this.handleSComparison(Object.keys(valueObj)[0], Object.values(valueObj)[0]);
			} else if (filter === "NOT") {
				const valueObj = Object(value);
				results = this.handleNegation(Object.keys(valueObj)[0], Object.values(valueObj)[0]);
			} else {
				throw new InsightError(`Invalid filter key: ${filter}`);
			}
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			} else {
				throw new InsightError("Unexpected error.");
			}
		}
		return results;
	}

	private handleNegation(filter: string, value: unknown): Section[] {
		try {
			const nonNegatedResults = this.handleFilter(filter, value);
			const datasetSections = this.sectionsDatabase.get(this.queryingIDString);
			if (datasetSections === undefined) {
				// should not be possible given current implementation of other methods for query
				throw new InsightError("Can't find querying dataset");
			} else {
				return datasetSections.filter((section) => !nonNegatedResults.includes(section));
			}
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			} else {
				throw new InsightError("Unexpected error.");
			}
		}
	}

	private handleSComparison(skey: string, input: string): Section[] {
		try {
			// split on underscore
			const idstring = skey.split("_")[0];
			const sfield = skey.split("_")[1];

			// check if database contains dataset with idstring
			if (!this.sectionsDatabase.has(idstring)) {
				throw new InsightError(`Dataset with id: ${idstring} not added.`);
			}

			// check if a dataset has already been referenced
			if (this.queryingIDString === "") {
				this.queryingIDString = idstring;
			} else if (this.queryingIDString !== idstring) {
				throw new InsightError("Cannot reference multiple datasets.");
			}

			// query based on idstring
			const datasetSections = this.sectionsDatabase.get(idstring);
			if (datasetSections === undefined) {
				// should not be possible
				throw new InsightError("Can't find querying dataset");
			} else {
				if (this.sFields.includes(sfield)) {
					const fieldIndex = this.sFields.indexOf(sfield);
					const validInputRegex = /[*]?[^*]*[*]?/;
					if (!validInputRegex.test(input)) {
						throw new InsightError(" Asterisks (*) can only be the first or last characters of input strings");
					}
					// fix this return, figure out what sfield is, how to match it, and how to access
					return datasetSections.filter((section) => RegExp(input).test(section.sfields[fieldIndex]));
				} else {
					throw new InsightError("Invalid sKey");
				}
			}
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			} else {
				throw new InsightError("Unexpected error.");
			}
		}
	}

	private handleOPTIONS(options: object, sections: Section[]): InsightResult[] {
		const results: InsightResult[] = [];
		//console.log(options, sections);
		return results;
	}
	*/

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
