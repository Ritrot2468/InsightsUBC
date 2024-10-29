import { InsightError, InsightResult, ResultTooLargeError } from "./IInsightFacade";
import { QueryOrderHandler } from "./QueryOrderHandler";
import QueryUtils from "./QueryUtils";
import QueryEngineFilter from "./QueryEngineFilter";
import Section from "./sections/Section";

export default class QueryEngine {
	private queryingIDString: string;
	private sectionsDatabase: Map<string, Section[]>;
	private noFilter: boolean;
	private utils: QueryUtils;
	private QueryOrderHandler: QueryOrderHandler;
	private QueryEngineFilter: QueryEngineFilter;

	constructor(sectionsDatabase: Map<string, Section[]>) {
		this.queryingIDString = "";
		this.sectionsDatabase = sectionsDatabase;
		this.noFilter = false;
		this.utils = new QueryUtils();
		this.QueryOrderHandler = new QueryOrderHandler();
		this.QueryEngineFilter = new QueryEngineFilter(sectionsDatabase);
	}

	public async query(query: unknown): Promise<InsightResult[]> {
		//console.log("QUERY method");
		let filteredSections: Section[] = [];
		let result: InsightResult[] = [];
		this.queryingIDString = ""; // restart on every query;
		const queryObj = Object(query);
		try {
			const queryKeys = Object.keys(queryObj);
			const invalidKeys = queryKeys.filter((key) => !this.utils.validQueryKeys.includes(key));
			if (invalidKeys.length > 0) {
				throw new InsightError("Excess keys in query");
			}
			// If WHERE key exists, filter all the sections, else throw InsightError
			if ("WHERE" in queryObj) {
				filteredSections = await this.handleWHERE(queryObj.WHERE);
			} else {
				throw new InsightError("Query missing WHERE");
			}

			// If OPTIONS key exists, collect InsightResults, else throw InsightError
			if ("OPTIONS" in queryObj) {
				result = await this.handleOPTIONS(queryObj.OPTIONS, filteredSections);
			} else {
				throw new InsightError("Query missing OPTIONS");
			}
			//console.log("End result");
			//console.log(result);
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			}
			throw new InsightError("Unexpected error.");
		}
		return result;
	}

	private async handleWHERE(where: object): Promise<Section[]> {
		let filteredSections: Section[] = [];
		this.noFilter = false;
		//console.log("WHERE WORKING");
		try {
			if (Object.keys(where).length === 0) {
				this.noFilter = true;
				return filteredSections;
			} else if (Object.keys(where).length > 1) {
				throw new InsightError("WHERE should only have 1 key");
			} else {
				const filter = Object.keys(where)[0];
				const values = Object.values(where)[0];
				filteredSections = await this.QueryEngineFilter.handleFilter(filter, values);
			}
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			}
			throw new InsightError("Unexpected error.");
		}
		return filteredSections;
	}

	// check if an id string is already being referenced, if not, return true
	private checkIDString(idstring: string): boolean {
		if (!this.sectionsDatabase.has(idstring)) {
			throw new InsightError(`Dataset with id: ${idstring} not added.`);
		}
		// check if a dataset has already been referenced if not set queryingIDString as idstring
		if (this.queryingIDString === "") {
			this.queryingIDString = idstring;
		} else if (this.queryingIDString !== idstring) {
			throw new InsightError("Cannot reference multiple datasets.");
		}
		return true;
	}

	private async handleOPTIONS(options: object, sections: Section[]): Promise<InsightResult[]> {
		//console.log("OPTIONS WORKING");
		let results: InsightResult[] = [];
		let columns: string[] = [];
		let orderKey = "";
		try {
			const optionsKeys = Object.keys(options);
			const invalidKeys = optionsKeys.filter((key) => !this.utils.validOptions.includes(key));
			if (invalidKeys.length > 0) {
				throw new InsightError("Invalid keys in OPTIONS");
			}

			if ("COLUMNS" in options) {
				columns = this.handleCOLUMNS(options.COLUMNS);
			} else {
				throw new InsightError("Query missing COLUMNS");
			}
			//console.log(columns);
			if ("ORDER" in options) {
				orderKey = await this.QueryOrderHandler.handleORDER(options.ORDER, columns);
			}
			results = await this.completeQuery(sections, columns, orderKey);
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			}
			throw new InsightError("Unexpected error.");
		}
		return results;
	}

	private async completeQuery(sections: Section[], columns: string[], orderKey: string): Promise<InsightResult[]> {
		let results: InsightResult[] = [];
		//console.log("COMPLETE QUERY WORKING");
		// if no filters have been applied
		if (this.noFilter) {
			const datasetSections = this.sectionsDatabase.get(this.queryingIDString);
			if (datasetSections === undefined) {
				// should not be possible given current implementation of other methods for query
				throw new InsightError("Can't find querying dataset");
			} else {
				sections = datasetSections;
			}
		}
		this.utils.checkSize(sections);
		results = await this.utils.selectCOLUMNS(sections, columns);
		results = await this.utils.sortByOrder(results, orderKey);
		return results;
	}
	// returns the columns as an array of strings (WORKING)
	private handleCOLUMNS(value: unknown): string[] {
		const columns = this.utils.coerceToArray(value); // checks if is an array, if so, coerce to array type
		const results: string[] = [];
		for (const key of columns) {
			const keyStr = String(key);
			const field = keyStr.split("_")[1];
			this.checkIDString(keyStr.split("_")[0]);
			if (this.utils.mFields.includes(field) || this.utils.sFields.includes(field)) {
				results.push(keyStr);
			} else {
				throw new InsightError(`Invalid key ${keyStr} in COLUMNS`);
			}
		}
		return results;
	}
}
