import Section, { InsightError, InsightResult, ResultTooLargeError } from "./IInsightFacade";

export default class QueryEngine {
	private queryingIDString: string;
	private sectionsDatabase: Map<string, Section[]>;
	private noFilter: boolean;
	private logicComparator: String[] = ["AND", "OR"];
	private mComparator: String[] = ["LT", "GT", "EQ"];
	private sFields: String[] = ["uuid", "id", "title", "instructor", "dept"];
	private mFields: String[] = ["year", "avg", "pass", "fail", "audit"];

	constructor(sectionsDatabase: Map<string, Section[]>) {
		this.queryingIDString = "";
		this.sectionsDatabase = sectionsDatabase;
		this.noFilter = true;
	}

	public async query(query: unknown): Promise<InsightResult[]> {
		return new Promise((resolve) => {
			let filteredSections: Section[] = [];
			let result: InsightResult[] = [];
			const numKeys = 2;
			this.queryingIDString = ""; // restart on every query;
			const queryObj = Object(query);
			try {
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

	private handleLogicComparison() {}

	private filterMComparison(dataset: Section[], filter: string, index: number, input: number): Section[] {
		if (filter === "LT") {
			return dataset.filter((section) => section.getMFieldByIndex(index) < input);
		} else if (filter === "GT") {
			return dataset.filter((section) => section.getMFieldByIndex(index) > input);
		} else if (filter === "EQ") {
			return dataset.filter((section) => section.getMFieldByIndex(index) === input);
		} else {
			throw new InsightError("Invalid MComparator");
		}
	}

	// check if an id string is already being referenced, if not, return true
	private checkIDString(idstring: string): boolean {
		if (!this.sectionsDatabase.has(idstring)) {
			throw new InsightError(`Dataset with id: ${idstring} not added.`);
		}
		// check if a dataset has already been referenced
		if (this.queryingIDString === "") {
			this.queryingIDString = idstring;
		} else if (this.queryingIDString !== idstring) {
			throw new InsightError("Cannot reference multiple datasets.");
		}
		return true;
	}

	private handleOPTIONS(options: object, sections: Section[]): InsightResult[] {
		const results: InsightResult[] = [];
		//console.log(options, sections);
		return results;
	}
}
