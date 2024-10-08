import Section, { InsightError, InsightResult, Mfield, ResultTooLargeError, Sfield } from "./IInsightFacade";

export default class QueryUtils {
	private sFields: string[] = ["uuid", "id", "title", "instructor", "dept"];
	private mFields: string[] = ["year", "avg", "pass", "fail", "audit"];

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
				results.sort((recordA, recordB) => {
					const valueA = recordA[orderKey];
					const valueB = recordB[orderKey];

					// Handle string comparisons
					if (typeof valueA === "string" && typeof valueB === "string") {
						return valueA.localeCompare(valueB);
					}

					// Handle number comparisons
					if (typeof valueA === "number" && typeof valueB === "number") {
						return valueA - valueB;
					}

					// Handle mixed types (string vs number)
					return String(valueA).localeCompare(String(valueB));
				});

				return results;

		}
	}
	// public sortByOrder(results: InsightResult[], orderKey: string): InsightResult[] {
	// 	if (orderKey === "") {
	// 		return results;
	// 	} else {
	// 		// in the case of numbers stored as string
	// 		results.sort((recordA, recordB) => {
	// 			const valueA = recordA[orderKey];
	// 			const valueB = recordB[orderKey];
	//
	// 			// Handle string comparisons
	// 			if (typeof valueA === "string" && typeof valueB === "string") {
	// 				return valueA.localeCompare(valueB);
	// 			}
	//
	// 			// Handle number comparisons
	// 			if (typeof valueA === "number" && typeof valueB === "number") {
	// 				return valueA - valueB;
	// 			}
	//
	// 			// Handle mixed types (string vs number)
	// 			// You can choose how to handle this; here we convert numbers to strings for comparison
	// 			return String(valueA).localeCompare(String(valueB));
	// 		});
	// 		// results.sort((recordA, recordB) => {
	// 		// 	return (recordA[orderKey] as string).localeCompare(recordB[orderKey] as string);
	// 		// });
	// 	}
	// 	return results;
	// }

	public async selectCOLUMNS(sections: Section[], columns: string[]): Promise<InsightResult[]> {
		const resultsPromises = sections.map(async (section) => {
			const currRecord: InsightResult = {};

			const fieldPromises = columns.map(async (column) => {
				const field = column.split("_")[1];

				if (this.mFields.includes(field)) {
					const mIndex = this.mFields.indexOf(field);
					currRecord[column] = section.getMFieldByIndex(mIndex);
				} else {
					const sIndex = this.sFields.indexOf(field);
					currRecord[column] = section.getSFieldByIndex(sIndex);
				}
			});

			await Promise.all(fieldPromises); // Wait for all column-related field fetches
			return currRecord;
		});

		const results = await Promise.all(resultsPromises);
		// Wait for all section-related records to be processed
		return results;
	}

	// public selectCOLUMNS(sections: Section[], columns: string[]): InsightResult[] {
	// 	const results: InsightResult[] = [];
	// 	for (const section of sections) {
	// 		const currRecord: InsightResult = {};
	// 		for (const column of columns) {
	// 			const field = column.split("_")[1];
	// 			if (this.mFields.includes(field)) {
	// 				const mIndex = this.mFields.indexOf(field);
	// 				currRecord[column] = section.getMFieldByIndex(mIndex);
	// 			} else {
	// 				const sIndex = this.sFields.indexOf(field);
	// 				currRecord[column] = section.getSFieldByIndex(sIndex);
	// 			}
	// 		}
	// 		results.push(currRecord);
	// 	}
	// 	return results;
	// }

	public filterMComparison(dataset: Section[], filter: string, index: number, input: number): Section[] {
		let results: Section[];
		//console.log("FILTER MCOMPARISON WORKING");
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
		let shortestList = andList.reduce((shortest, currArray) => {
			return currArray.length < shortest.length ? currArray : shortest;
		}, andList[0]);

		for (const currArray of andList) {
			if (currArray === shortestList) {
				continue;
			} // Skip comparing the shortest list with itself

			// Filter the shortest list to keep only sections that exist in the current array
			shortestList = shortestList.filter((section) =>
				currArray.some((currSection) => this.isEqual(section, currSection))
			);
		}
		return shortestList;
	}

	public isEqual(section1: Section, section2: Section): boolean {
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
}
