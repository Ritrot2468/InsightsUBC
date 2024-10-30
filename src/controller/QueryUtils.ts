import { InsightError, InsightResult, ResultTooLargeError } from "./IInsightFacade";

export default class QueryUtils {
	public logicComparator: string[] = ["AND", "OR"];
	public mComparator: string[] = ["LT", "GT", "EQ"];
	public sFieldsSection: string[] = ["uuid", "id", "title", "instructor", "dept"];
	public mFieldsSection: string[] = ["year", "avg", "pass", "fail", "audit"];
	public sFieldsRoom: string[] = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
	public mFieldsRoom: string[] = ["lat", "lon", "seats"];
	public validOptions: string[] = ["COLUMNS", "ORDER"];
	public validQueryKeys: string[] = ["WHERE", "OPTIONS", "TRANSFORMATIONS"];
	//public validSort: string[] = ["dir", "keys"];

	public coerceToArray(value: unknown): unknown[] {
		if (Array.isArray(value)) {
			return value;
		} else {
			throw new InsightError("Not an array.");
		}
	}

	public checkSize(transformedResults: Object[]): boolean {
		const maxQuerySize = 5000;
		if (transformedResults.length > maxQuerySize) {
			throw new ResultTooLargeError(
				"The result is too big. Only queries with a maximum of 5000 results are supported."
			);
		} else {
			return true;
		}
	}

	// DONE?
	public async sortByOrder(results: InsightResult[], orderKeys: string[], dir: string): Promise<InsightResult[]> {
		if (orderKeys.length === 0) {
			return results;
		} else {
			// Perform the sorting asynchronously
			return new Promise((resolve) => {
				setTimeout(() => {
					results.sort((recordA, recordB) => this.sortFunction(recordA, recordB, orderKeys, dir));
					// Resolve the promise with the sorted results
					resolve(results);
				}, 0);
			});
		}
	}

	// helper function for sortByOrder
	private sortFunction(recordA: InsightResult, recordB: InsightResult, orderKeys: string[], dir: string): number {
		for (const key of orderKeys) {
			const valueA = recordA[key];
			const valueB = recordB[key];
			let comparison = 0;

			if (valueA === undefined || valueB === undefined) {
				throw new InsightError(`a record has an undefined value for ${key}`);
			}

			if (typeof valueA === "string" && typeof valueB === "string") {
				comparison =
					dir === "UP" ? (comparison = valueA.localeCompare(valueB)) : (comparison = valueB.localeCompare(valueA));
				if (comparison !== 0) {
					return comparison;
				}
			} else if (typeof valueA === "number" && typeof valueB === "number") {
				comparison = dir === "UP" ? (comparison = valueA - valueB) : (comparison = valueB - valueA);

				if (comparison !== 0) {
					return comparison;
				}
			} else {
				// Handle mixed types (e.g., string vs number)
				comparison =
					dir === "UP"
						? (comparison = String(valueA).localeCompare(String(valueB)))
						: (comparison = String(valueB).localeCompare(String(valueA)));
				if (comparison !== 0) {
					return comparison;
				}
			}
		}
		return 0;
	}

	// select columns of the transformedResults (transformedResults may be a transformed objects, sections, or rooms)
	public async selectCOLUMNS(
		transformedResults: Object[],
		columns: string[],
		isGrouped: boolean
	): Promise<InsightResult[]> {
		const results = transformedResults.map((result) => {
			const currRecord: InsightResult = {};
			const resultObj = result as Record<string, any>;

			columns.forEach((column) => {
				const field = column.split("_")[1];
				// using the implementation of individuals fields of rooms and sections
				if (isGrouped) {
					currRecord[column] = resultObj[column];
				} else {
					currRecord[column] = resultObj[field];
				}
			});

			return currRecord;
		});
		return results;
	}

	// REQUIRES: mfield valid, input is a number, dataset is valid, filter is valid
	// helper function for handleMCompare
	public async filterMCompare(dataset: Object[], filter: string, mfield: string, input: number): Promise<Object[]> {
		let results: Object[];
		//console.log("FILTER MCOMPARISON WORKING");
		if (filter === "LT") {
			results = dataset.filter((SOR) => (SOR as Record<string, any>)[mfield] < input);
		} else if (filter === "GT") {
			results = dataset.filter((SOR) => (SOR as Record<string, any>)[mfield] > input);
		} else if (filter === "EQ") {
			results = dataset.filter((SOR) => (SOR as Record<string, any>)[mfield] === input);
		} else {
			throw new InsightError("Invalid MComparator");
		}
		return results;
	}

	public async mergeAndList(andList: Object[][]): Promise<Object[]> {
		// make a map
		const SORCountMap = new Map<Object, number>();

		// find the shortest list
		const shortestList = andList.reduce((shortest, currArray) => {
			return currArray.length < shortest.length ? currArray : shortest;
		});

		// turn into a set for faster lookup
		const shortestSet = new Set(shortestList);

		// add all section in shortest list to map and increment count by 1
		shortestSet.forEach((SOR) => {
			SORCountMap.set(SOR, (SORCountMap.get(SOR) || 0) + 1);
		});

		// iterate through each array of section
		for (const currArray of andList) {
			// skip comparison with itself
			if (currArray === shortestList) {
				continue;
			}

			const currSet = new Set(currArray);

			// only keep sections or rooms in the shortest list that are also in the current array
			shortestList.forEach((SOR) => {
				if (!currSet.has(SOR)) {
					SORCountMap.delete(SOR); // Remove sections not found in currArray
				}
			});
		}

		// filter the shortest list to include only sections present in all arrays
		return shortestList.filter((SOR) => SORCountMap.has(SOR));
	}

	public isObject(obj: unknown): void {
		if (Array.isArray(obj)) {
			throw new InsightError("Invalid object present");
		}
	}

	public testRegex(input: string): RegExp {
		const validInputRegex = /^[*]?[^*]*[*]?$/;
		if (!validInputRegex.test(input)) {
			throw new InsightError(" Asterisks (*) can only be the first or last characters of input strings");
		}
		// fix this return, figure out what sfield is, how to match it, and how to access
		const processedInput = input.replace(/\*/g, ".*");
		return new RegExp(`^${processedInput}$`); // Use case-insensitive matching
	}

	// checks if the idstring is valid, if it is return the type of dataset it refers to
	public checkIDString(
		sDSList: string[],
		rDSList: string[],
		sectionOrRoom: string,
		queryingIDString: string,
		idStr: string
	): string {
		// check if a dataset has already been referenced if not return whether its a section or a room DS
		if (queryingIDString === "") {
			//console.log(sDSList, rDSList)
			return this.checkSectionOrRoom(sDSList, rDSList, idStr);
		} else if (queryingIDString !== idStr) {
			throw new InsightError("Cannot reference multiple datasets.");
		} else {
			return sectionOrRoom;
		}
	}

	// checks if the idstr is in sectionsDS or roomsDS, otherwise throw error that the ds is not added
	public checkSectionOrRoom(sDSList: string[], rDSList: string[], idStr: string): string {
		if (sDSList.includes(idStr)) {
			return "section";
		} else if (rDSList.includes(idStr)) {
			return "room";
		} else {
			throw new InsightError(`Dataset with id: ${idStr} not added.`);
		}
	}
}
