import Section, {
	FieldsDictionary,
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	Mfield,
	Sfield,
} from "./IInsightFacade";
import JSZip from "jszip";

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
	private datasets: Map<string, InsightResult>;

	// tracks all sections added from a dataset using their associated id as the key
	private sectionsDatabase: Map<string, Section[]>;

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
			//const numRows = 2;

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
				// 	// Handle unexpected errors
				// 	//throw err;
				throw new InsightError(`An unexpected error occurred: ${err}`);
			}
		}
		// throw new Error(
		// 	`InsightFacadeImpl::addDataset() is unimplemented! - id=${id}; content=${content?.length}; kind=${kind}`
		// );
	}
	private addNewSection(section_id: string, jsonData: any): void {
		const result = jsonData.result[0];

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

	private async countRows(content: string, id: string): Promise<number> {
		// Decode base64 string into buffer
		const buffer = Buffer.from(content, "base64");

		// list of valid keys allowed for a query mapped to a string[]
		//const reqKeys = this.valid_fields.map((field) => `${id}_${field}`);

		// load buffer in JSZip -> zip file
		const zip = await JSZip.loadAsync(buffer);
		let numSections = 0;

		// tracks all the promises in
		const allPromises = [];

		//console.log(zip.files);

		// iterates through each course
		for (const key in zip.files) {
			//console.log("new course /n")
			const name = key;
			//console.log(name);
			//console.log(numSections);

			// check that the file name contains courses at start AND is followed by at least one alpha-numeric char
			// and that it doesn't an ending with a .(...) indicative of any unwanted file type
			if (name.match(/^courses\/\w/) && name.match(/^[^.]+$/)) {
				//console.log('current File:', zip.files[key]);

				// run async
				const promiseContent = zip.files[key].async("string").then(async (content0) => {
					//console.log('File Content:', content0);

					// Parse JSON file in content
					const jsonData = JSON.parse(content0);

					//console.log('JSON FILE:', jsonData);
					if (jsonData.result.length === 0) {
						return;
					}

					//console.log('key:', jsonData.result);
					const courseSections = Object.keys(jsonData.result);

					// iterate through the sections of each course in the dataset
					for (let i = 0; i < courseSections.length; i++) {
						const fieldKeys = Object.keys(jsonData.result[i]);

						//console.log('value:', jsonData.result[0][this.valid_fields[0]]);
						//console.log('required keys:', this.valid_fields)

						// checks if current section has all the valid fields, otherwise move on to next course
						if (this.valid_fields.every((element) => fieldKeys.includes(element))) {
							// 1) first create a list strings of our SFields and MFields string form to index into JSON object
							// 2) retrieve value associated with field and store into appropriate Sfield variable
							// 3) repeat steps with mfields
							// 4) instantiate new section with mfields and sfields collected
							// 5) store dataset info into our this.sectionsDataset
							this.addNewSection(id, jsonData);
							numSections++;

							//console.log(numSections)
							//console.log(this.sectionsDatabase.get(id))
						}
					}
				});
				//.catch((error) => {
				// 	throw error
				// });

				allPromises.push(promiseContent);
			}
		}
		// wait for all promises from the datasets to be fufilled
		await Promise.all(allPromises);

		// after iterating through all courses in dataset, if no valid section -> throw error
		if (numSections === 0) {
			throw new InsightError("No valid section");
		}

		return numSections;
	}

	public async removeDataset(id: string): Promise<string> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::removeDataset() is unimplemented! - id=${id};`);
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::performQuery() is unimplemented! - query=${query};`);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::listDatasets is unimplemented!`);
	}
}
