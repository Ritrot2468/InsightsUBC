import { InsightError, InsightResult, ResultTooLargeError } from "./IInsightFacade";
import { QueryOrderHandler } from "./QueryOrderHandler";
import QueryUtils from "./QueryUtils";
import QueryEngineFilter from "./QueryEngineFilter";
import Section from "./sections/Section";
import Room from "./rooms/Room";
//import DatasetValidatorHelper from "./DatasetValidatorHelper";
import QueryAggregation from "./QueryAggregation";

export default class QueryEngine {
	private sectionsDatabase: Map<string, Section[]>;
	private roomsDatabase: Map<string, Room[]>;
	private utils: QueryUtils;
	private QueryOrderHandler: QueryOrderHandler;
	private QueryEngineFilter: QueryEngineFilter;
	private QueryAggregation: QueryAggregation;
	private sDSList: string[];
	private rDSList: string[];
	private newCols: string[] = [];
	private queryingIDString = "";
	private sectionOrRoom = "";
	private isGrouped = false;
	private dir = "UP";
	private noFilter = false;
	//private datasetValidator: DatasetValidatorHelper;

	constructor(sectionsDatabase: Map<string, Section[]>, roomsDatabase: Map<string, Room[]>) {
		this.sectionsDatabase = sectionsDatabase;
		this.roomsDatabase = roomsDatabase;
		this.utils = new QueryUtils();
		this.QueryOrderHandler = new QueryOrderHandler();
		this.QueryEngineFilter = new QueryEngineFilter(this.sectionsDatabase, this.roomsDatabase);
		this.QueryAggregation = new QueryAggregation(this.sectionsDatabase, this.roomsDatabase);
		this.sectionOrRoom = "";
		//this.datasetValidator = new DatasetValidatorHelper();
		this.sDSList = [];
		this.rDSList = [];
		//console.log(this.rDSList);
	}

	private async querySetup(
		sectionsDatabase: Map<string, Section[]>,
		roomsDatabase: Map<string, Room[]>
	): Promise<boolean> {
		/*
		const idRecords = await this.datasetValidator.separateRoomAndCourseIDs(currIDs);
		this.rDSList = idRecords.rooms;
		this.sDSList = idRecords.sections;
		*/
		this.sectionsDatabase = sectionsDatabase;
		this.roomsDatabase = roomsDatabase;
		this.sDSList = Array.from(sectionsDatabase.keys());
		this.rDSList = Array.from(roomsDatabase.keys());
		this.QueryEngineFilter = new QueryEngineFilter(this.sectionsDatabase, this.roomsDatabase);
		this.QueryAggregation = new QueryAggregation(this.sectionsDatabase, this.roomsDatabase);
		this.sectionOrRoom = "";
		this.queryingIDString = ""; // restart on every query;
		this.isGrouped = false;
		this.dir = "UP";
		this.newCols = [];
		this.noFilter = false;
		return true;
	}

	public async query(query: unknown, sD: Map<string, Section[]>, rD: Map<string, Room[]>): Promise<InsightResult[]> {
		//console.log("QUERY method");
		//console.log(this.roomsDatabase.size);
		await this.querySetup(sD, rD);
		//console.log(this.rDSList);
		let filteredSOR: Object[] = [];
		let transformedResults: Object[] = [];
		let result: InsightResult[] = [];
		const queryObj = Object(query);
		//console.log(queryObj)
		try {
			const queryKeys = Object.keys(queryObj);
			//console.log(queryKeys)
			const invalidKeys = queryKeys.filter((key) => !this.utils.validQueryKeys.includes(key));
			if (invalidKeys.length > 0) {
				throw new InsightError("Excess keys in query");
			}
			// If WHERE key exists, filter all the sections, else throw InsightError
			if ("WHERE" in queryObj) {
				filteredSOR = await this.handleWHERE(queryObj.WHERE);
				//console.log(filteredSOR)
			} else {
				throw new InsightError("Query missing WHERE");
			}
			//console.log(filteredSOR);

			// If TRANSFORMATIONS key exists, complete transformation on filtered sections
			if ("TRANSFORMATIONS" in queryObj) {
				transformedResults = await this.handleTRANSFORMATIONS(queryObj.TRANSFORMATIONS, filteredSOR);
				//this.isGrouped = true;
			} else {
				transformedResults = filteredSOR;
			}
			//console.log(transformedResults);

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

				//TODO;
				//console.log(filter, values)
				filteredSOR = await this.QueryEngineFilter.handleFilter(filter, values);
				//console.log(filteredSOR)
				this.queryingIDString = this.QueryEngineFilter.queryingIDString;

				this.sectionOrRoom = this.QueryEngineFilter.sectionOrRoom;
			}
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			}
			throw new InsightError("Unexpected error in WHERE.");
		}
		return filteredSOR;
	}

	//TODO;
	private async handleTRANSFORMATIONS(transformations: object, filteredSOR: Object[]): Promise<Object[]> {
		let transformedResults: Object[] = [];
		let groupedResults: Record<string, any>;
		//const groupKeys;
		this.isGrouped = true;
		try {
			const transformationKeys = Object.keys(transformations);
			const invalidKeys = transformationKeys.filter((key) => !this.utils.validTransformationKeys.includes(key));
			if (invalidKeys.length > 0) {
				throw new InsightError("Invalid keys in TRANSFORMATIONS");
			}
			if ("GROUP" in transformations) {
				groupedResults = await this.QueryAggregation.handleGroupBy(
					transformations.GROUP,
					filteredSOR,
					this.noFilter,
					this.queryingIDString,
					this.sectionOrRoom
				);
			} else {
				throw new InsightError("TRANSFORMATIONS missing GROUP key");
			}

			if ("APPLY" in transformations) {
				transformedResults = await this.QueryAggregation.handleApply(transformations.APPLY, groupedResults);
				this.updateVar();
				//console.log("Promise resolved with:", transformedResults);
			} else {
				throw new InsightError("TRANSFORMATIONS missing APPLY key");
			}
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			}
			throw new InsightError("Unexpected error in TRANSFORMATIONS.");
		}
		return transformedResults;
	}

	private updateVar(): boolean {
		this.queryingIDString = this.QueryAggregation.queryingIDString;
		this.sectionOrRoom = this.QueryAggregation.sectionOrRoom;
		this.newCols = this.QueryAggregation.groupKeys.concat(this.QueryAggregation.applyKeys);
		//console.log(this.newCols);
		return true;
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
				this.dir = this.QueryOrderHandler.getDir();
			}

			results = await this.completeQuery(transformedResults, columns, orderKeys);
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			}
			throw new InsightError("Unexpected error in OPTIONS.");
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
		if (this.noFilter && !this.isGrouped) {
			if (this.sectionOrRoom === "section") {
				dataset = this.sectionsDatabase.get(this.queryingIDString);
			} else if (this.sectionOrRoom === "room") {
				dataset = this.roomsDatabase.get(this.queryingIDString);
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

		//console.log(transformedResults.length);
		this.utils.checkSize(transformedResults);

		//TODO
		results = await this.utils.selectCOLUMNS(transformedResults, columns, this.isGrouped);
		results = await this.utils.sortByOrder(results, orderKeys, this.dir);
		return results;
	}

	// returns the columns as an array of strings (WORKING)
	private handleCOLUMNS(value: unknown): string[] {
		//console.log("COLUMNS WORKING");
		const columns = this.utils.coerceToArray(value); // checks if is an array, if so, coerce to array type
		const results: string[] = [];
		for (const key of columns) {
			const keyStr = String(key);
			const field = keyStr.split("_")[1];
			const idstring = keyStr.split("_")[0];

			if (this.checkValidTransformColumn(keyStr)) {
				results.push(keyStr);
			} else {
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
		}
		return results;
	}

	private checkValidTransformColumn(keyStr: string): boolean {
		if (this.isGrouped) {
			if (this.newCols.includes(keyStr)) {
				return true;
			} else {
				throw new InsightError("Keys in COLUMNS must be in GROUP or APPLY when TRANSFORMATIONS is present");
			}
		} else {
			return false;
		}
	}

	// if the field is valid, return true, if sectionOrRoom is somehow empty throw error
	private checkValidColumn(field: string): boolean {
		//const field = keyStr.split("_")[1];
		if (this.sectionOrRoom === "section") {
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
