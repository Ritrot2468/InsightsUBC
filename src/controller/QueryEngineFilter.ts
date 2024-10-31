import { InsightError, ResultTooLargeError } from "./IInsightFacade";
import QueryUtils from "./QueryUtils";
import Section from "./sections/Section";
import Room from "./rooms/Room";

export default class QueryEngineFilter {
	public queryingIDString: string;
	private sectionsDatabase: Map<string, Section[]>;
	private roomsDatabase: Map<string, Room[]>;
	private utils: QueryUtils;
	public sectionOrRoom: string;
	private sDSList: string[];
	private rDSList: string[];
	private currDataset: Object[];

	constructor(sectionsDatabase: Map<string, Section[]>, roomsDatabase: Map<string, Room[]>) {
		this.queryingIDString = "";
		this.sectionsDatabase = sectionsDatabase;
		this.roomsDatabase = roomsDatabase;
		this.utils = new QueryUtils();
		this.sectionOrRoom = "";
		this.sDSList = Array.from(sectionsDatabase.keys());
		this.rDSList = Array.from(roomsDatabase.keys());
		this.currDataset = [];
	}

	public setIDs(sDSList: string[], rDSList: string[]): void {
		this.rDSList = rDSList;
		this.sDSList = sDSList;
	}

	public async handleFilter(filter: string, value: unknown): Promise<Object[]> {
		let promise: Promise<Object[]>;
		try {
			//console.log("Filter running");
			//console.log(filter);
			//console.log(this.sDSList, this.rDSList)
			if (this.utils.logicComparator.includes(filter)) {
				promise = this.handleLogicComparison(filter, value);
			} else if (this.utils.mComparator.includes(filter) || filter === "IS" || filter === "NOT") {
				this.utils.isObject(value);
				const [key, input] = Object.entries(value as Record<string, any>)[0];
				//console.log(key)
				switch (filter) {
					case "IS":
						if (typeof input !== "string") {
							throw new InsightError("Invalid skey type.");
						}
						promise = this.handleSComparison(key, input);
						break;
					case "NOT":
						promise = this.handleNegation(key, input);
						break;
					default: // mComparator
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

	private async getDataset(): Promise<Object[]> {
		if (this.currDataset.length !== 0) {
			return this.currDataset;
		} else {
			let dataset: Object[] | undefined = [];
			if (this.sectionOrRoom === "section") {
				dataset = this.sectionsDatabase.get(this.queryingIDString);
			} else if (this.sectionOrRoom === "room") {
				dataset = this.roomsDatabase.get(this.queryingIDString);
			} else {
				throw new InsightError("sections or room not defined in getDataset.");
			}
			if (dataset === undefined) {
				// should not be possible given current implementation of other methods for query
				throw new InsightError("Can't find querying dataset.");
			} else {
				return dataset;
			}
		}
	}

	private async handleNegation(filter: string, value: unknown): Promise<Object[]> {
		try {
			const nonNegatedResults = await this.handleFilter(filter, value);
			const dataset = await this.getDataset();
			// use a set instead -> faster?
			const resolvedNonNegatedSet = new Set(nonNegatedResults);

			// Filter using the Set for faster lookups
			return dataset.filter((SOR) => !resolvedNonNegatedSet.has(SOR));
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			}
			throw new InsightError("Unexpected error in Negation.");
		}
	}

	private async handleSComparison(skey: string, input: string): Promise<Object[]> {
		try {
			// split on underscore
			const idstring = skey.split("_")[0];
			const sfield = skey.split("_")[1];

			// check if database contains dataset with idstring
			//this.utils.checkIDString(this.sectionsDatabase, this.queryingIDString, idstring);
			this.sectionOrRoom = this.utils.checkIDString(
				this.sDSList,
				this.rDSList,
				this.sectionOrRoom,
				this.queryingIDString,
				idstring
			);
			this.queryingIDString = idstring;

			// query based on idstring
			const dataset = await this.getDataset();
			const inputRegex = this.utils.testRegex(input); // Use case-insensitive matching
			if (this.sectionOrRoom === "section") {
				if (this.utils.sFieldsSection.includes(sfield)) {
					return dataset.filter((SOR) => inputRegex.test((SOR as Record<string, any>)[sfield]));
				}
			} else if (this.sectionOrRoom === "room") {
				if (this.utils.sFieldsRoom.includes(sfield)) {
					return dataset.filter((SOR) => inputRegex.test((SOR as Record<string, any>)[sfield]));
				}
			}
			throw new InsightError("Invalid sKey");
			/*
			if (this.utils.sFields.includes(sfield)) {
				const fieldIndex = this.utils.sFields.indexOf(sfield);
				const inputRegex = this.utils.testRegex(input); // Use case-insensitive matching
				return datasetSections.filter((section) => inputRegex.test(section.getSFieldByIndex(fieldIndex)));
			} else {
				throw new InsightError("Invalid sKey");
			}*/
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			}
			throw new InsightError("Unexpected error in SComparison.");
		}
	}

	private async handleMComparison(filter: string, mkey: string, input: number): Promise<Object[]> {
		//console.log("HANDLING MCOMPARISON");
		//console.log("mkey: " + mkey);
		//console.log("input: " + input);
		try {
			const idstring = mkey.split("_")[0];
			const mfield = mkey.split("_")[1];

			// check if database contains dataset with idstring
			//this.utils.checkIDString(this.sectionsDatabase, this.queryingIDString, idstring);
			this.sectionOrRoom = this.utils.checkIDString(
				this.sDSList,
				this.rDSList,
				this.sectionOrRoom,
				this.queryingIDString,
				idstring
			);
			this.queryingIDString = idstring;

			const dataset = await this.getDataset();
			if (this.sectionOrRoom === "section") {
				if (this.utils.mFieldsSection.includes(mfield)) {
					return this.utils.filterMCompare(dataset, filter, mfield, input);
				}
			} else if (this.sectionOrRoom === "room") {
				if (this.utils.mFieldsRoom.includes(mfield)) {
					return this.utils.filterMCompare(dataset, filter, mfield, input);
				}
			}
			throw new InsightError("Invalid mKey");
			/*
			if (this.utils.mFields.includes(mfield)) {
				const fieldIndex = this.utils.mFields.indexOf(mfield);
				return this.utils.filterMCompare(datasetSections, filter, fieldIndex, input);
			} else {
				throw new InsightError("Invalid mKey");
			}*/
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			}
			throw new InsightError("Unexpected error.");
		}
	}

	private async handleLogicComparison(filter: string, value: unknown): Promise<Object[]> {
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

	private async handleAND(value: unknown[]): Promise<Object[]> {
		const andListPromises: Promise<Object[]>[] = [];
		if (value.length === 0) {
			throw new InsightError("AND must be a non-empty array");
		}
		for (const obj of value) {
			if (typeof obj === "object" && obj !== null) {
				const key: Promise<Object[]> = this.handleFilter(
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

	private async handleOR(value: unknown[]): Promise<Object[]> {
		const orList: Promise<Object[]>[] = [];
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
