import Section, { InsightError, InsightResult, ResultTooLargeError } from "./IInsightFacade";

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

	constructor(sectionsDatabase: Map<string, Section[]>) {
		this.queryingIDString = "";
		this.sectionsDatabase = sectionsDatabase;
		this.noFilter = false;
	}

	public async query(query: unknown): Promise<InsightResult[]> {
		console.log("QUERY method");
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

				console.log(filteredSections);
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
		console.log("WHERE WORKING");
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
		console.log("HANDLING FILTER");
		console.log(filter);
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
				console.log(key, input)
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
					const validInputRegex = /[*]?[^*]*[*]?/;
					if (!validInputRegex.test(input)) {
						throw new InsightError(" Asterisks (*) can only be the first or last characters of input strings");
					}
					// fix this return, figure out what sfield is, how to match it, and how to access
					const inputRegex = RegExp(input);
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
		console.log("HANDLING MCOMPARISON");
		console.log("mkey: " + mkey);
		console.log("input: " + input);
		try {
			const idstring = mkey.split("_")[0];
			const mfield = mkey.split("_")[1];

			// check if database contains dataset with idstring
			this.checkIDString(idstring);
			const datasetSections = this.sectionsDatabase.get(idstring);
			console.log(this.sectionsDatabase.size);
			if (datasetSections === undefined) {
				// should not be possible
				throw new InsightError("Can't find querying dataset");
			} else {
				if (this.mFields.includes(mfield)) {
					const fieldIndex = this.mFields.indexOf(mfield);
					return this.filterMComparison(datasetSections, filter, fieldIndex, input);
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

	private handleLogicComparison(filter: string, value: unknown): Section[] {
		try {
			const comparisonArray: unknown[] = this.coerceToArray(value);
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

	private handleAND(value: unknown[]): Section[] {
		const andList = [];
		if (value.length === 0) {
			throw new InsightError("AND must be a non-empty array");
		}
		for (const obj of value) {
			andList.push(this.handleFilter(Object(obj).keys[0], Object(obj).values[0]));
		}
		return andList.reduce((acc, currArray) => acc.filter((section) => currArray.includes(section)));
	}

	private handleOR(value: unknown[]): Section[] {
		const orList = [];
		if (value.length === 0) {
			throw new InsightError("OR must be a non-empty array");
		}
		for (const obj of value) {
			orList.push(this.handleFilter(Object(obj).keys[0], Object(obj).values[0]));
		}
		return orList.flat();
	}

	private coerceToArray(value: unknown): unknown[] {
		if (Array.isArray(value)) {
			return value;
		} else {
			throw new InsightError("Not an array.");
		}
	}

	private filterMComparison(dataset: Section[], filter: string, index: number, input: number): Section[] {
		let results: Section[];
		console.log("FILTER MCOMPARISON WORKING");
		console.log(dataset);
		if (filter === "LT") {
			results = dataset.filter((section) => {
				//console.log(section.getMFieldByIndex(index), input);
				return section.getMFieldByIndex(index) < input;
			});
		} else if (filter === "GT") {
			results = dataset.filter((section) => section.getMFieldByIndex(index) > input);
		} else if (filter === "EQ") {
			results = dataset.filter((section) => section.getMFieldByIndex(index) === input);
		} else {
			throw new InsightError("Invalid MComparator");
		}
		return results;
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
				throw new InsightError("Query missing WHERE");
			}

			if ("ORDER" in options) {
				orderKey = this.handleORDER(options.ORDER, this.coerceToArray(options.COLUMNS) as string[]);
			}
			orderKey = orderKey.split("_")[1];
			results = this.completeQuery(sections, columns, orderKey);

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

		for (const section of sections) {
			const currRecord: InsightResult = {};
			for (const column of columns) {
				if (this.mFields.includes(column)) {
					const mIndex = this.mFields.indexOf(column);
					currRecord[`${this.queryingIDString}_${column}`] = section.getMFieldByIndex(mIndex);
				} else {
					const sIndex = this.sFields.indexOf(column);
					currRecord[`${this.queryingIDString}_${column}`] = section.getSFieldByIndex(sIndex);
				}
			}
			results.push(currRecord);
		}

		results = this.sortByOrder(results, orderKey);
		return results;
	}

	private sortByOrder(results: InsightResult[], orderKey: string): InsightResult[] {
		if (orderKey === "") {
			return results;
		} else {
			if (this.mFields.includes(orderKey)) {
				results.sort((recordA, recordB) => {
					return (recordA[orderKey] as number) - (recordB[orderKey] as number);
				});
			} else {
				results.sort((recordA, recordB) => {
					return (recordA[orderKey] as string).localeCompare(recordB[orderKey] as string);
				});
			}
		}
		return results;
	}

	// returns the columns as an array of strings
	private handleCOLUMNS(value: unknown): string[] {
		const columns = this.coerceToArray(value);
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

	// returns the order key as a string
	private handleORDER(value: unknown, columns: string[]): string {
		const valueStr = String(value);
		if (columns.includes(valueStr)) {
			return valueStr;
		} else {
			throw new InsightError("ORDER key must be in COLUMNS");
		}
	}
}
