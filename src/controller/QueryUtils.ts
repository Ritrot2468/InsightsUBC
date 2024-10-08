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
			return new Promise((resolve) => {
				setTimeout(() => {
					results.sort((recordA, recordB) => {
						const valueA = recordA[orderKey];
						const valueB = recordB[orderKey];

						if (typeof valueA === "string" && typeof valueB === "string") {
							return valueA.localeCompare(valueB);
						}

						if (typeof valueA === "number" && typeof valueB === "number") {
							return valueA - valueB;
						}

						// Handle mixed types (e.g., string vs number)
						return String(valueA).localeCompare(String(valueB));
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

	//TODO: I had to change the name because lint and prettier would not let me push unless I shortened line
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
		let shortestList = andList.reduce((shortest, currArray) => {
			return currArray.length < shortest.length ? currArray : shortest;
		}, andList[0]);

		for (const currArray of andList) {
			if (currArray === shortestList) {
				continue;
			} // Skip comparing the shortest list with itself

			// Filter the shortest list to keep only sections that exist in the current array
			shortestList = shortestList.filter(async (section) =>
				currArray.some(async (currSection) => this.isEqual(section, currSection))
			);
		}
		return shortestList;
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

	public async isEqual(section1: Section, section2: Section): Promise<boolean> {
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
