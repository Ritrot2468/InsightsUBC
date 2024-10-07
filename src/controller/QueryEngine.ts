import Section, {InsightError, InsightResult, Mfield, ResultTooLargeError, Sfield} from "./IInsightFacade";
import QueryUtils from "./QueryUtils";

export default class QueryEngine {
	private queryingIDString: string;
	private sectionsDatabase: Map<string, Section[]>;
	private noFilter: boolean;
	private logicComparator: string[] = ["AND", "OR"];
	private mComparator: string[] = ["LT", "GT", "EQ"];
	private sFields: string[] = ["uuid", "id", "title", "instructor", "dept"];
	private mFields: string[] = ["year", "avg", "pass", "fail", "audit"];
	private validOptions: string[] = ["COLUMNS", "ORDER"];
	private validQueryKeys: string[] = ["WHERE", "OPTIONS"];
	private utils: QueryUtils;

	constructor(sectionsDatabase: Map<string, Section[]>) {
		this.queryingIDString = "";
		this.sectionsDatabase = sectionsDatabase;
		this.noFilter = false;
		this.utils = new QueryUtils();
	}

	public async query(query: unknown): Promise<InsightResult[]> {
		//console.log("QUERY method");
		return new Promise((resolve) => {
			let filteredSections: Section[] = [];
			let result: InsightResult[] = [];
			this.queryingIDString = ""; // restart on every query;
			const queryObj = Object(query);
			try {
				const queryKeys = Object.keys(queryObj);
				const invalidKeys = queryKeys.filter((key) => !this.validQueryKeys.includes(key));
				if (invalidKeys.length > 0) {
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
		this.noFilter = false;
		//console.log("WHERE WORKING");
		try {
			if (Object.keys(where).length === 0) {
				this.noFilter = true;
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
		//console.log("HANDLING FILTER");
		//console.log(filter);
		try {
			if (this.logicComparator.includes(filter)) {
				results = this.handleLogicComparison(filter, value);
			} else if (this.mComparator.includes(filter)) {
				const entry = Object.entries(value as Record<string, number>);
				const [key, input] = entry[0];
				results = this.handleMComparison(filter, key, input);
			} else if (filter === "IS") {
				// property to value pairing
				const entry = Object.entries(value as Record<string, string>);
				const [key, input] = entry[0];
				results = this.handleSComparison(key, input);
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
			this.checkIDString(idstring);

			// query based on idstring
			const datasetSections = this.sectionsDatabase.get(idstring);
			if (datasetSections === undefined) {
				// should not be possible
				throw new InsightError("Can't find querying dataset");
			} else {
				if (this.sFields.includes(sfield)) {
					const fieldIndex = this.sFields.indexOf(sfield);
					const validInputRegex = /^[*]?[^*]*[*]?$/;
					if (!validInputRegex.test(input)) {
						throw new InsightError(" Asterisks (*) can only be the first or last characters of input strings");
					}
					// fix this return, figure out what sfield is, how to match it, and how to access
					const processedInput = input.replace(/\*/g, '.*');
					const inputRegex = new RegExp(`^${processedInput}$`);  // Use case-insensitive matching

					return datasetSections.filter((section) => inputRegex.test(section.getSFieldByIndex(fieldIndex)));
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

	private handleMComparison(filter: string, mkey: string, input: number): Section[] {
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
				if (this.mFields.includes(mfield)) {
					const fieldIndex = this.mFields.indexOf(mfield);
					return this.utils.filterMComparison(datasetSections, filter, fieldIndex, input);
				} else {
					throw new InsightError("Invalid mKey");
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

	private handleLogicComparison(filter: string, value: unknown): Section[] {
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
			} else {
				throw new InsightError("Unexpected error.");
			}
		}
	}

	private isEqual(section1: Section, section2: Section): boolean {
		// Compare Sfield
		const sfield1 = section1.getSfields();
		const sfield2 = section2.getSfields();
		for (const key of Object.keys(sfield1) as (keyof Sfield)[]) {
			if (sfield1[key] !== sfield2[key]) {
				return false;
			}
		}

		// Compare Mfield
		const mfield1 = section1.getMfields();
		const mfield2 = section2.getMfields();
		for (const key of Object.keys(mfield1) as (keyof Mfield)[]) {
			if (mfield1[key] !== mfield2[key]) {
				return false;
			}
		}

		return true;
	}


	private handleAND(value: unknown[]): Section[] {
		const andList = [];
		if (value.length === 0) {
			throw new InsightError("AND must be a non-empty array");
		}
		for (const obj of value) {
			if (typeof obj === "object" && obj !== null) {
				const filterKey: string = Object.keys(obj)[0];
				const filterVal: unknown = Object.values(obj)[0];
				const key = this.handleFilter(filterKey, filterVal);
				andList.push(key);
			}
		}

		// only one filter applied
			if (andList.length === 1) {
				return andList[0];
			}

		let shortestList = andList.reduce((shortest, currArray) => {
			return currArray.length < shortest.length ? currArray : shortest;
		}, andList[0]);

		for (const currArray of andList) {
			if (currArray === shortestList) {
				continue;}  // Skip comparing the shortest list with itself

			// Filter the shortest list to keep only sections that exist in the current array
			shortestList = shortestList.filter((section) =>
				currArray.some((currSection) => this.isEqual(section, currSection))
			);
		}

		return shortestList;

		//return andList.reduce((acc, currArray) => acc.filter((section) => currArray.includes(section)));
	}


	private handleOR(value: unknown[]): Section[] {
		const orList = [];
		if (value.length === 0) {
			throw new InsightError("OR must be a non-empty array");
		}

		for (const obj of value) {
			if (typeof obj === "object" && obj !== null) {
				const filterKey: string = Object.keys(obj)[0];
				const filterVal: unknown = Object.values(obj)[0];
				const key = this.handleFilter(filterKey, filterVal);
				orList.push(key);
			}
		}
		return orList.flat();
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

	private handleOPTIONS(options: object, sections: Section[]): InsightResult[] {
		//console.log("OPTIONS WORKING");
		let results: InsightResult[] = [];
		let columns: string[] = [];
		let orderKey = "";
		try {
			const optionsKeys = Object.keys(options);
			const invalidKeys = optionsKeys.filter((key) => !this.validOptions.includes(key));
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
				orderKey = this.handleORDER(options.ORDER, this.utils.coerceToArray(options.COLUMNS) as string[]);
			}
			orderKey = orderKey.split("_")[1];
			results = this.completeQuery(sections, columns, orderKey);
			//console.log(results);
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			} else {
				throw new InsightError("Unexpected error.");
			}
		}
		return results;
	}

	// REQUIRES: columns are valid columns, sections are filtered sections, orderKey is valid
	private completeQuery(sections: Section[], columns: string[], orderKey: string): InsightResult[] {
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
		results = this.utils.selectCOLUMNS(sections, columns);
		results = this.utils.sortByOrder(results, orderKey);
		return results;
	}

	// returns the columns as an array of strings (WORKING)
	private handleCOLUMNS(value: unknown): string[] {
		const columns = this.utils.coerceToArray(value);
		const results: string[] = [];
		for (const key of columns) {
			const keyStr = String(key);
			const idstring = keyStr.split("_")[0];
			const field = keyStr.split("_")[1];

			this.checkIDString(idstring);
			if (this.mFields.includes(field) || this.sFields.includes(field)) {
				results.push(keyStr);
			} else {
				throw new InsightError(`Invalid key ${keyStr} in COLUMNS`);
			}
		}
		return results;
	}

	// returns the order key as a string (WORKING)
	private handleORDER(value: unknown, columns: string[]): string {
		const valueStr = String(value);
		if (columns.includes(valueStr)) {
			return valueStr;
		} else {
			throw new InsightError("ORDER key must be in COLUMNS");
		}
	}
}
