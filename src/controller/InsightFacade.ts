import Section, {
	FieldsDictionary,
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	Mfield,
	NotFoundError,
	Sfield,
} from "./IInsightFacade";
import JSZip from "jszip";
import fs from "fs-extra";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private valid_fields: string[] = [
		"id",
		"Course",
		"Title",
		"Professor",
		"Subject",
		"Year",
		"Avg",
		"Pass",
		"Fail",
		"Audit",
	];

	private valid_dataset_fields: string[] = [
		"uuid",
		"id",
		"title",
		"instructor",
		"dept",
		"year",
		"avg",
		"pass",
		"fail",
		"audit",
	];

	// Keep order of mFields and sFields according to chart found in Section Specification sheet
	// for consistency
	public mFields: string[] = ["Year", "Avg", "Pass", "Fail", "Audit"];

	public sFields: string[] = ["id", "Course", "Title", "Professor", "Subject"];

	// dictionary to map the field found in file to its corresponding field for using query engine
	private dictionary: FieldsDictionary = {};

	// map to track record
	private readonly datasets: Map<string, InsightResult>;

	// tracks all sections added from a dataset using their associated id as the key
	private readonly sectionsDatabase: Map<string, Section[]>;

	// list of name of current IDs added
	private currIDs: string[];

	// TODO: find out if dataset was the same but diff ID if it can be added

	constructor() {
		//Log.info("InsightFacadeImpl::init()");
		this.datasets = new Map<string, InsightResult>();
		this.sectionsDatabase = new Map<string, []>();
		this.currIDs = [];
		// initialize dictionary for the fields
		for (let i = 0; i < this.valid_fields.length; i++) {
			this.dictionary[this.valid_fields[i]] = this.valid_dataset_fields[i];
		}
	}
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		try {
			// Validate ID follows proper format
			if (id.includes("_") || id.trim().length === 0) {
				throw new InsightError("Invalid ID structure");
			}

			// Check if ID already exists
			if (this.currIDs.includes(id)) {
				throw new InsightError("Dataset already in our record");
			}

			// Validate content based on its kind
			const base64Regex = /^[^_]+$/;
			if (!base64Regex.test(id)) {
				throw new InsightError("Invalid id");
			}

			// Number of rows found associated with the insightKind
			const numRows = await this.countRows(content, id);
			//console.log(numRows)

			// Create an InsightResult record
			const newRecord: InsightResult = {
				[kind]: numRows,
			};

			// Store the dataset
			this.datasets.set(id, newRecord);
			this.currIDs.push(id);

			// Resolve with the dataset ID
			return this.currIDs;
		} catch (err) {
			if (err instanceof InsightError) {
				throw err;
			} else {
				throw new InsightError(`An unexpected error occurred: ${err}`);
			}
		}
	}

	// helper function to create and add new section sections_database
	private addNewSection(section_id: string, jsonData: any): void {
		const result = jsonData;

		const [uuid, id, title, instructor, dept] = this.sFields.map((sfield) => result[sfield]);

		const sectionSfields: Sfield = {
			uuid,
			id,
			title,
			instructor,
			dept,
		};

		const [year, avg, pass, fail, audit] = this.mFields.map((mfield) => result[mfield]);

		const sectionMfields: Mfield = {
			year,
			avg,
			pass,
			fail,
			audit,
		};
		// log section into database of datasets
		// if id has not been logged yet, log it, else append new section to list of sections in dictionary
		const newSection: Section = new Section(sectionMfields, sectionSfields);
		if (id in this.sectionsDatabase) {
			this.sectionsDatabase.get(section_id)?.push(newSection);
		} else {
			this.sectionsDatabase.set(section_id, [newSection]);
		}
	}

	// helper function to countRows in a given dataset
	private async countRows(content: string, id: string): Promise<number> {
		// Decode base64 string into buffer
		const buffer = Buffer.from(content, "base64");
		// load buffer in JSZip -> zip file
		const zip = await JSZip.loadAsync(buffer);

		// tracks number of sections in a given dataset and is initialized to 0
		let numSections = 0;

		// where each promise is appended to for each course object
		const allPromises = [];
		// iterates through each course
		for (const key in zip.files) {
			const name = key;

			// check that the file name contains courses at start AND is followed by at least one alpha-numeric char
			// and that it doesn't an ending with a .(...)  (ex .png or .json or etc) indicative of an unwanted file type
			if (name.match(/^courses\/\w/) && name.match(/^[^.]+$/)) {
				// run async to start loading the courses concurrently into a string -> then parse int JSON object

				const promiseContent = zip.files[key].async("string").then(async (content0) => {
					//console.log('File Content:', content0);
					// Parse JSON file in content
					const jsonData = JSON.parse(content0);
					//console.log('JSON FILE:', jsonData);

					// for cases where result:[] with no sections inside
					if (jsonData.result.length === 0) {
						return null;
					}

					// 1) first create a list strings of our SFields and MFields string form to index into JSON object
					// 2) retrieve value associated with field and store into appropriate Sfield variable
					// 3) repeat steps with mfields
					// 4) instantiate new section with mfields and sfields collected
					// 5) store dataset info into our this.sectionsDataset

					// iterate through the sections of each course in the dataset
					// Then filter the valid sections based on the required fields

					const validSectionsInCourse = this.filterValidSections(jsonData);

					jsonData.result = validSectionsInCourse;

					// turn all valid sections to Sections objects
					validSectionsInCourse.forEach((section: any) => {
						this.addNewSection(id, section);
						numSections++;
					});
					return { name, jsonData };
				});
				allPromises.push(promiseContent);
			}
		}
		const courseDataList = await Promise.all(allPromises);
		await this.storeCoursesOnDisk(courseDataList, id);

		// after iterating through all courses in dataset, if no valid section -> throw error
		if (numSections === 0) {
			throw new InsightError("No valid section");
		}

		return numSections;
	}

	private filterValidSections(jsonData: any): any {
		const hasAllValidFields = (section: any, validFields: string[]): boolean => {
			const fieldKeys = Object.keys(section);
			return validFields.every((field) => fieldKeys.includes(field));
		};

		const validSectionsInCourse = jsonData.result.filter((section: any) =>
			hasAllValidFields(section, this.valid_fields)
		);
		return validSectionsInCourse;
	}

	private async storeCoursesOnDisk(
		courseDataList: Awaited<null | { jsonData: any; name: string }>[],
		id: string
	): Promise<void> {
		const allCoursePromises = [];
		for (const course of courseDataList) {
			if (course) {
				const courseData = fs.outputJson(`./data/${id}/${course.name}.json`, course.jsonData);
				allCoursePromises.push(courseData);
			}
		}
		await Promise.all(allCoursePromises);
	}

	public async removeDataset(id: string): Promise<string> {
		try {
			// Validate ID follows proper format
			if (id.includes("_") || id.trim().length === 0) {
				throw new InsightError("Invalid ID structure");
			}

			// check that ID already exists
			if (this.datasets.has(id)) {
				this.currIDs = this.currIDs.filter((currentId) => currentId !== id);
				this.datasets.delete(id);
				this.sectionsDatabase.delete(id);

				await fs.remove(`./data/${id}`);
				// return id name of set currently removed
				return id;
			} else {
				throw new NotFoundError("Dataset not found");
			}
		} catch (err) {
			if (err instanceof InsightError) {
				throw new InsightError("");
			}

			if (err instanceof NotFoundError) {
				throw new NotFoundError("Not found");
			}
			// Handle unexpected errors
			throw new InsightError("An unexpected error occurred ${err.message}");
		}
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::performQuery() is unimplemented! - query=${query};`);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		return new Promise((resolve) => {
			const result: InsightDataset[] = [];

			this.datasets.forEach((val, key) => {
				const newInsightDataset: InsightDataset = {
					id: key,
					// So far since adding dataset with the same ID twice is not allowed ******
					kind: Object.keys(val)[0] as InsightDatasetKind,
					numRows: val[Object.keys(val)[0]] as number,
				};
				result.push(newInsightDataset);
			});
			resolve(result);
		});
	}

	// public async listDatasets(): Promise<InsightDataset[]> {
	// 	const result: InsightDataset[] = [];
	//
	// 	try {
	// 		const sets = await fs.promises.readdir("./data");
	// 		const promises = sets.map(async (set) => {
	// 			try {
	// 				const rows = await fs.promises.readdir(`./data/${set}/courses`);
	// 				const newInsightDataset: InsightDataset = {
	// 					id: set,
	// 					kind: InsightDatasetKind.Sections,
	// 					numRows: rows.length
	// 				};
	// 				result.push(newInsightDataset);
	// 			} catch (err) {
	// 				console.error(`Error reading data for dataset ${set}:`, err);
	// 			}
	// 		});
	//
	// 		// Wait for all promises to resolve
	// 		await Promise.all(promises);
	//
	// 		return result;
	// 	} catch (err) {
	// 		console.error("Error reading 'src/data' directory:", err);
	// 		throw err; // Handle errors
	// 	}
	// }
}
