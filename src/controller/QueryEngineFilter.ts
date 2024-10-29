import { InsightError, ResultTooLargeError } from "./IInsightFacade";
import QueryUtils from "./QueryUtils";
import Section from "./sections/Section";

export default class QueryEngineFilter {
	private queryingIDString: string;
	private sectionsDatabase: Map<string, Section[]>;
	private utils: QueryUtils;

	constructor(sectionsDatabase: Map<string, Section[]>) {
		this.queryingIDString = "";
		this.sectionsDatabase = sectionsDatabase;
		this.utils = new QueryUtils();
	}

	public async handleFilter(filter: string, value: unknown): Promise<Section[]> {
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
}
