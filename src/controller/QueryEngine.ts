import { InsightError, InsightResult, ResultTooLargeError } from "./IInsightFacade";
import { QueryOrderHandler } from "./QueryOrderHandler";
import QueryUtils from "./QueryUtils";
import QueryEngineFilter from "./QueryEngineFilter";
import Section from "./sections/Section";
import Room from "./rooms/Room";

export default class QueryEngine {
	private queryingIDString: string;
	private sectionsDatabase: Map<string, Section[]>;
	private roomsDatabase: Map<string, Room[]>;
	private noFilter: boolean;
	private utils: QueryUtils;
	private QueryOrderHandler: QueryOrderHandler;
	private QueryEngineFilter: QueryEngineFilter;
	private sectionOrRoom: string;
	private sDSList: string[];
	private rDSList: string[];
	private newCols: string[];
	private isGrouped: boolean;
	private dir: string;

	constructor(sectionsDatabase: Map<string, Section[]>, roomsDatabase: Map<string, Room[]>) {
		this.queryingIDString = "";
		this.sectionsDatabase = sectionsDatabase;
		this.roomsDatabase = roomsDatabase;
		this.noFilter = false;
		this.utils = new QueryUtils();
		this.QueryOrderHandler = new QueryOrderHandler();
		this.QueryEngineFilter = new QueryEngineFilter(sectionsDatabase, roomsDatabase);
		this.sectionOrRoom = "";
		this.sDSList = Array.from(sectionsDatabase.keys());
		this.rDSList = Array.from(roomsDatabase.keys());
		this.newCols = [];
		this.isGrouped = false;
		this.dir = "UP"; // default (one key) sorting is UP
	}

	public async query(query: unknown): Promise<InsightResult[]> {
		//console.log("QUERY method");
		let filteredSOR: Object[] = [];
		let transformedResults: Object[] = [];
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
				filteredSOR = await this.handleWHERE(queryObj.WHERE);
			} else {
				throw new InsightError("Query missing WHERE");
			}

			// If TRANSFORMATIONS key exists, complete transformation on filtered sections
			if ("TRANSFORMATIONS" in queryObj) {
				transformedResults = await this.handleTRANSFORMATIONS(queryObj.TRANSFORMATIONS, filteredSOR);
				//this.isGrouped = true;
			} else {
				transformedResults = filteredSOR;
			}

			// If OPTIONS key exists, collect InsightResults, else throw InsightError
			if ("OPTIONS" in queryObj) {
				result = await this.handleOPTIONS(queryObj.OPTIONS, transformedResults);
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

	// handling section or room in filter
	private async handleWHERE(where: object): Promise<Object[]> {
		let filteredSOR: Object[] = [];
		this.noFilter = false;
		//console.log("WHERE WORKING");
		try {
			if (Object.keys(where).length === 0) {
				this.noFilter = true;
				return filteredSOR;
			} else if (Object.keys(where).length > 1) {
				throw new InsightError("WHERE should only have 1 key");
			} else {
				const filter = Object.keys(where)[0];
				const values = Object.values(where)[0];

				//TODO
				filteredSOR = await this.QueryEngineFilter.handleFilter(filter, values);
				this.queryingIDString = this.QueryEngineFilter.queryingIDString;
				this.sectionOrRoom = this.utils.checkSectionOrRoom(this.sDSList, this.rDSList, this.queryingIDString);
			}
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			}
			throw new InsightError("Unexpected error.");
		}
		return filteredSOR;
	}

	// TODO
	private async handleTRANSFORMATIONS(transformations: object, filteredSOR: Object[]): Promise<Object[]> {
		const transformedResults: Object[] = [];
		this.isGrouped = true;
		return transformedResults;
	}

	private async handleOPTIONS(options: object, transformedResults: Object[]): Promise<InsightResult[]> {
		//console.log("OPTIONS WORKING");
		let results: InsightResult[] = [];
		let columns: string[] = [];
		let orderKeys: string[] = [];
		try {
			const optionsKeys = Object.keys(options);
			const invalidKeys = optionsKeys.filter((key) => !this.utils.validOptions.includes(key));
			if (invalidKeys.length > 0) {
				throw new InsightError("Invalid keys in OPTIONS");
			}

			// Done
			if ("COLUMNS" in options) {
				columns = this.handleCOLUMNS(options.COLUMNS);
			} else {
				throw new InsightError("Query missing COLUMNS");
			}

			//console.log(columns);
			// Done
			if ("ORDER" in options) {
				orderKeys = await this.QueryOrderHandler.handleORDER(options.ORDER, columns);
				this.dir = this.QueryOrderHandler.dir;
			}

			results = await this.completeQuery(transformedResults, columns, orderKeys);
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			}
			throw new InsightError("Unexpected error.");
		}
		return results;
	}

	private async completeQuery(
		transformedResults: Object[],
		columns: string[],
		orderKeys: string[]
	): Promise<InsightResult[]> {
		let results: InsightResult[] = [];
		let dataset: Object[] | undefined = [];
		//console.log("COMPLETE QUERY WORKING");
		// if no filters have been applied
		if (this.noFilter) {
			if (this.sectionOrRoom === "section") {
				dataset = this.sectionsDatabase.get(this.queryingIDString);
			} else if (this.sectionOrRoom === "room") {
				dataset = this.sectionsDatabase.get(this.queryingIDString);
			} else {
				throw new InsightError("section or room undefined");
			}
			if (dataset === undefined) {
				// should not be possible given current implementation of other methods for query
				throw new InsightError("Can't find querying dataset");
			} else {
				transformedResults = dataset;
			}
		}

		this.utils.checkSize(transformedResults);

		//TODO
		results = await this.utils.selectCOLUMNS(transformedResults, columns, this.isGrouped);
		results = await this.utils.sortByOrder(results, orderKeys, this.dir);
		return results;
	}

	// returns the columns as an array of strings (WORKING)
	private handleCOLUMNS(value: unknown): string[] {
		const columns = this.utils.coerceToArray(value); // checks if is an array, if so, coerce to array type
		const results: string[] = [];
		for (const key of columns) {
			const keyStr = String(key);
			const field = keyStr.split("_")[1];
			const idstring = keyStr.split("_")[0];

			this.sectionOrRoom = this.utils.checkIDString(
				this.sDSList,
				this.rDSList,
				this.sectionOrRoom,
				this.queryingIDString,
				idstring
			);
			this.queryingIDString = idstring;

			// checks if the field is a valid field
			if (this.checkValidColumn(field)) {
				results.push(keyStr);
			} else {
				throw new InsightError(`Invalid key ${keyStr} in COLUMNS`);
			}
		}
		return results;
	}

	// if the field is valid, return true, if sectionOrRoom is somehow empty throw error
	private checkValidColumn(field: string): boolean {
		if (this.isGrouped) {
			if (this.newCols.includes(field)) {
				return true;
			}
		} else if (this.sectionOrRoom === "section") {
			if (this.utils.mFieldsSection.includes(field) || this.utils.sFieldsSection.includes(field)) {
				return true;
			}
		} else if (this.sectionOrRoom === "room") {
			if (this.utils.mFieldsRoom.includes(field) || this.utils.sFieldsRoom.includes(field)) {
				return true;
			}
		} else {
			throw new InsightError("section or room undefined");
		}
		return false;
	}
}
