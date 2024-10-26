import { InsightError, InsightResult, ResultTooLargeError } from "./IInsightFacade";
import { QueryOrderHandler } from "./QueryOrderHandler";
import QueryUtils from "./QueryUtils";
import Section from "./sections/Section";

export default class QueryEngine {
	private queryingIDString: string;
	private sectionsDatabase: Map<string, Section[]>;
	private noFilter: boolean;
	private utils: QueryUtils;
	private QueryOrderHandler: QueryOrderHandler;

	constructor(sectionsDatabase: Map<string, Section[]>) {
		this.queryingIDString = "";
		this.sectionsDatabase = sectionsDatabase;
		this.noFilter = false;
		this.utils = new QueryUtils();
		this.QueryOrderHandler = new QueryOrderHandler();
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
				filteredSections = await this.handleFilter(Object.keys(where)[0], Object.values(where)[0]);
			}
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			}
			throw new InsightError("Unexpected error.");
		}
		return filteredSections;
	}

	private async handleFilter(filter: string, value: unknown): Promise<Section[]> {
		let promise: Promise<Section[]>;
		try {
			//console.log("Filter running");
			//console.log(filter);
			if (this.utils.logicComparator.includes(filter)) {
				promise = this.handleLogicComparison(filter, value);
			} else if (this.utils.mComparator.includes(filter) || filter === "IS" || filter === "NOT") {
				this.utils.isObject(value);
				const [key, input] = Object.entries(value as Record<string, any>)[0];
				switch (filter) {
					case "IS":
						if (typeof input !== "string") {
							throw new InsightError(`Invalid input type for IS`);
						}
						promise = this.handleSComparison(key, input);
						break;
					case "NOT":
						promise = this.handleNegation(key, input);
						break;
					default:
						if (typeof input !== "number") {
							throw new InsightError(`Invalid input type for ${filter}`);
						}
						promise = this.handleMComparison(filter, key, input);
				}
			} else {
				throw new InsightError(`Invalid filter key: ${filter}`);
			}
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			}
			throw new InsightError("Unexpected error.");
		}
		return promise;
	}

	private async handleNegation(filter: string, value: unknown): Promise<Section[]> {
		try {
			const nonNegatedResults = this.handleFilter(filter, value);
			const datasetSections = this.sectionsDatabase.get(this.queryingIDString);
			if (datasetSections === undefined) {
				// should not be possible given current implementation of other methods for query
				throw new InsightError("Can't find querying dataset");
			} else {
				// use a set instead -> faster?
				const resolvedNonNegatedSet = new Set(await nonNegatedResults);

				// Filter using the Set for faster lookups
				return datasetSections.filter((section) => !resolvedNonNegatedSet.has(section));
			}
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			}
			throw new InsightError("Unexpected error.");
		}
	}

	private async handleSComparison(skey: string, input: string): Promise<Section[]> {
		try {
			if (typeof input === "number") {
				throw new InsightError("Invalid skey type");
			}
			// split on underscore
			const idstring = skey.split("_")[0];
			const sfield = skey.split("_")[1];

			// check if database contains dataset with idstring
			this.checkIDString(idstring);

			// query based on idstring
			const datasetSections = this.sectionsDatabase.get(idstring);
			if (datasetSections === undefined) {
				// should not be possible
				throw new InsightError("Can't find querying dataset");
			} else {
				if (this.utils.sFields.includes(sfield)) {
					const fieldIndex = this.utils.sFields.indexOf(sfield);
					const inputRegex = this.utils.testRegex(input); // Use case-insensitive matching
					return datasetSections.filter((section) => inputRegex.test(section.getSFieldByIndex(fieldIndex)));
				} else {
					throw new InsightError("Invalid sKey");
				}
			}
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			}
			throw new InsightError("Unexpected error.");
		}
	}

	private async handleMComparison(filter: string, mkey: string, input: number): Promise<Section[]> {
		//console.log("HANDLING MCOMPARISON");
		//console.log("mkey: " + mkey);
		//console.log("input: " + input);
		try {
			const idstring = mkey.split("_")[0];
			const mfield = mkey.split("_")[1];

			// check if database contains dataset with idstring
			this.checkIDString(idstring);
			const datasetSections = this.sectionsDatabase.get(idstring);
			if (datasetSections === undefined) {
				// should not be possible
				throw new InsightError("Can't find querying dataset");
			} else {
				if (this.utils.mFields.includes(mfield)) {
					const fieldIndex = this.utils.mFields.indexOf(mfield);
					return this.utils.filterMCompare(datasetSections, filter, fieldIndex, input);
				} else {
					throw new InsightError("Invalid mKey");
				}
			}
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			}
			throw new InsightError("Unexpected error.");
		}
	}

	private async handleLogicComparison(filter: string, value: unknown): Promise<Section[]> {
		try {
			const comparisonArray: unknown[] = this.utils.coerceToArray(value);
			if (filter === "AND") {
				return this.handleAND(comparisonArray);
			} else if (filter === "OR") {
				return this.handleOR(comparisonArray);
			} else {
				throw new InsightError("Invalid Logic Comparator");
			}
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			}
			throw new InsightError("Unexpected error.");
		}
	}

	private async handleAND(value: unknown[]): Promise<Section[]> {
		const andListPromises: Promise<Section[]>[] = [];
		if (value.length === 0) {
			throw new InsightError("AND must be a non-empty array");
		}
		for (const obj of value) {
			if (typeof obj === "object" && obj !== null) {
				const key: Promise<Section[]> = this.handleFilter(
					Object.keys(obj)[0] as string,
					Object.values(obj)[0] as unknown
				);
				andListPromises.push(key);
			} else {
				throw new InsightError("Invalid Object");
			}
		}
		const andList = await Promise.all(andListPromises);
		/*console.log(andList.length);
		for (const list of andList) {
			console.log(list.length);
		}*/
		// only one filter applied
		if (andList.length === 1) {
			return andList[0];
		}
		const mergedList = this.utils.mergeAndList(andList);
		//console.log((await mergedList).length);
		return mergedList;
	}

	private async handleOR(value: unknown[]): Promise<Section[]> {
		const orList: Promise<Section[]>[] = [];
		if (value.length === 0) {
			throw new InsightError("OR must be a non-empty array");
		}

		for (const obj of value) {
			if (typeof obj === "object" && obj !== null) {
				orList.push(this.handleFilter(Object.keys(obj)[0] as string, Object.values(obj)[0] as unknown));
			} else {
				throw new InsightError("Invalid Object");
			}
		}
		const resolvedOrList = await Promise.all(orList);
		return resolvedOrList.flat();
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
