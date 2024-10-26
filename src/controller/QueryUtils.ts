import { InsightError, InsightResult, ResultTooLargeError } from "./IInsightFacade";
import Section from "./sections/Section";

export default class QueryUtils {
	public logicComparator: string[] = ["AND", "OR"];
	public mComparator: string[] = ["LT", "GT", "EQ"];
	public sFields: string[] = ["uuid", "id", "title", "instructor", "dept"];
	public mFields: string[] = ["year", "avg", "pass", "fail", "audit"];
	public validOptions: string[] = ["COLUMNS", "ORDER"];
	public validQueryKeys: string[] = ["WHERE", "OPTIONS"];

	public coerceToArray(value: unknown): unknown[] {
		if (Array.isArray(value)) {
			return value;
		} else {
			throw new InsightError("Not an array.");
		}
	}

	public checkSize(sections: Section[]): boolean {
		const maxQuerySize = 5000;
		if (sections.length > maxQuerySize) {
			throw new ResultTooLargeError(
				"The result is too big. Only queries with a maximum of 5000 results are supported."
			);
		} else {
			return true;
		}
	}

	public async sortByOrder(results: InsightResult[], orderKey: string): Promise<InsightResult[]> {
		if (orderKey === "") {
			return results;
		} else {
			// Perform the sorting asynchronously
			return new Promise((resolve) => {
				setTimeout(() => {
					results.sort((recordA, recordB) => {
						const valueA = recordA[orderKey];
						const valueB = recordB[orderKey];

						if (typeof valueA === "string" && typeof valueB === "string") {
							return valueA.localeCompare(valueB);
						} else if (typeof valueA === "number" && typeof valueB === "number") {
							return valueA - valueB;
						} else {
							// Handle mixed types (e.g., string vs number)
							return String(valueA).localeCompare(String(valueB));
						}
					});
					// Resolve the promise with the sorted results
					resolve(results);
				}, 0);
			});
		}
	}

	public async selectCOLUMNS(sections: Section[], columns: string[]): Promise<InsightResult[]> {
		const results = sections.map((section) => {
			const currRecord: InsightResult = {};

			columns.forEach((column) => {
				const field = column.split("_")[1];

				if (this.mFields.includes(field)) {
					const mIndex = this.mFields.indexOf(field);
					currRecord[column] = section.getMFieldByIndex(mIndex);
				} else {
					const sIndex = this.sFields.indexOf(field);
					currRecord[column] = section.getSFieldByIndex(sIndex);
				}
			});

			return currRecord;
		});
		return results;
	}

	public async filterMCompare(dataset: Section[], filter: string, index: number, input: number): Promise<Section[]> {
		let results: Section[];
		//console.log("FILTER MCOMPARISON WORKING");
		if (typeof input === "string") {
			throw new InsightError("Invalid mkey type");
		}
		if (filter === "LT") {
			results = dataset.filter((section) => section.getMFieldByIndex(index) < input);
		} else if (filter === "GT") {
			results = dataset.filter((section) => section.getMFieldByIndex(index) > input);
		} else if (filter === "EQ") {
			results = dataset.filter((section) => section.getMFieldByIndex(index) === input);
		} else {
			throw new InsightError("Invalid MComparator");
		}
		return results;
	}

	public async mergeAndList(andList: Section[][]): Promise<Section[]> {
		// make a map
		const sectionCountMap = new Map<Section, number>();

		// find the shortest list
		const shortestList = andList.reduce((shortest, currArray) => {
			return currArray.length < shortest.length ? currArray : shortest;
		});

		// turn into a set for faster lookup
		const shortestSet = new Set(shortestList);

		// add all section in shortest list to map and increment count by 1
		shortestSet.forEach((section) => {
			sectionCountMap.set(section, (sectionCountMap.get(section) || 0) + 1);
		});

		// iterate through each array of section
		for (const currArray of andList) {
			// skip comparison with itself
			if (currArray === shortestList) {
				continue;
			}

			const currSet = new Set(currArray);

			// only keep sections in the shortest list that are also in the current array
			shortestList.forEach((section) => {
				if (!currSet.has(section)) {
					sectionCountMap.delete(section); // Remove sections not found in currArray
				}
			});
		}

		// filter the shortest list to include only sections present in all arrays
		return shortestList.filter((section) => sectionCountMap.has(section));
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
}
