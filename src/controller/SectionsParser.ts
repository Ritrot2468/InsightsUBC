import JSZip from "jszip";
import Section, { InsightDataset, InsightDatasetKind, Mfield, Sfield } from "./IInsightFacade";
import fs from "fs-extra";
import { DatasetRecord } from "./DiskReader";

export default class SectionsParser {
	private valid_fields: string[] = [
		"Year",
		"Course",
		"Title",
		"Professor",
		"Subject",
		"id",
		"Avg",
		"Pass",
		"Fail",
		"Audit",
	];

	// Keep order of mFields and sFields according to chart found in Section Specification sheet
	// for consistency
	public mFields: string[] = ["Year", "Avg", "Pass", "Fail", "Audit"];

	public sFields: string[] = ["id", "Course", "Title", "Professor", "Subject"];

	private static OVERALL_SECTION_YEAR = 1900;

	public async logDatasetOnDisk(content: string, id: string): Promise<void> {
		const buffer = Buffer.from(content, "base64");
		const zip = await JSZip.loadAsync(buffer);
		await this.logDataset(zip, id);
	}

	// Writes InsightDataset info about a dataset
	public async logInsightKindToDisk(id: string, kind: InsightDatasetKind, numRows: number): Promise<void> {
		const obj = {
			table: [{ id, kind, numRows }],
		};
		//obj.table.push({id: id, kind: kind, numRows: numRows} as never);
		const json = JSON.stringify(obj);
		await fs.outputFile(`./data/${id}/kind`, json);
	}

	// Writes InsightDataset info about a dataset
	public async logInsightKindFromDisk(ids: string[]): Promise<InsightDataset[]> {
		const allPromises = ids.map(async (id) => {
			const file = await fs.promises.readFile(`./data/${id}/kind`, "utf8");
			const obj = JSON.parse(file);

			const numRows = obj.table[0].numRows as number;
			const kind = obj.table[0].kind as InsightDatasetKind;

			const newInsightDataset: InsightDataset = {
				id: id,
				kind: kind,
				numRows: numRows,
			};

			return newInsightDataset;
		});

		const result = await Promise.all(allPromises);
		return result;
	}

	// REQUIRES: jsonData - parsed JSON Object of the result key in a given course file
	//
	// EFFECTS: Iterate through each section in a given course file and for each section obtain all the sfields and mfields
	// 			and checks that each section contains all the fields in the variable valid_fields, else filter out.
	//
	// OUTPUT: returns all the valid sections as a JSONObject.
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

	// REQUIRES: zip - current dataset content as a JSZIP
	// 			  id - name of dataset
	// EFFECTS: parses the JSZIP files in the dataset and sorts through each JSON file containing each course, then
	// 			parses the JSON object to obtain the 'result' object and finds all sections,
	//          filters only valid sections,
	//          write the valid sections with the associated dataset id onto the disk
	// OUTPUT: void
	private async logDataset(zip: JSZip, id: string): Promise<void> {
		const allPromises = [];

		for (const key in zip.files) {
			const name = key;

			if (name.match(/^courses\/\w/) && name.match(/^[^.]+$/)) {
				const promiseContent = zip.files[key].async("string").then(async (content0) => {
					const jsonData = JSON.parse(content0);

					if (jsonData.result.length === 0) {
						return null;
					}

					const validSectionsInCourse = this.filterValidSections(jsonData);
					jsonData.result = validSectionsInCourse;

					return { name, jsonData };
				});

				allPromises.push(promiseContent);
			}
		}

		const courseDataList = await Promise.all(allPromises);
		await this.storeCoursesOnDisk(courseDataList, id);
	}

	// REQUIRES: id - name of dataset
	// EFFECTS: A helper function that can be used by performQuery to turn a dataset written in the disk into a
	// 			DatasetRecord  -> a key value pair of the all the valid sections associated with the given dataset id.
	// OUTPUT:  DatasetRecord, mapping the list of Sections to its associated dataset id
	public async turnDatasetToSection(id: string): Promise<DatasetRecord> {
		// tracks number of sections in a given dataset and is initialized to 0

		// where each promise is appended to for each course object
		const allPromises: any[] = [];
		const sections: Section[] = [];

		// list of all courses under the dataset file
		const path = await fs.readdir(`./data/${id}/courses/`);
		for (const course of path) {
			const promise = fs
				.readJson(`./data/${id}/courses/${course}`)
				.then(async (file) => {
					if (file.result.length === 0) {
						return null;
					}
					const validSectionsInCourse = this.filterValidSections(file);
					file.result = validSectionsInCourse;
					// turn all valid sections to Sections objects
					validSectionsInCourse.forEach((section: any) => {
						if (section.Section === "overall") {
							const newSection = this.createSection(section);
							newSection.setMfield(newSection.getMFieldIndex("year"), SectionsParser.OVERALL_SECTION_YEAR);
							sections.push(newSection);
						} else {
							sections.push(this.createSection(section));
						}
					});

					return { id, file };
				})
				.catch((err) => {
					throw err;
				});

			allPromises.push(promise);
		}

		await Promise.all(allPromises);
		const datasetRecord: DatasetRecord = { id: id, sections: sections };
		return datasetRecord;
	}

	// REQUIRES: jsonData - parsed JSON Object of a valid section from the result key in a given course file
	// EFFECTS: Retrieves the fields of the section and populate the values of the sfields and mfields into a Section object
	// OUTPUT: newly populated and created Section object
	private createSection(jsonData: any): Section {
		const result = jsonData;

		const [uuid, id, title, instructor, dept]: string[] = this.sFields.map((sfield) => {
			const value = result[sfield] as string;
			return value;
		});

		const sectionSfields: Sfield = {
			uuid: String(uuid),
			id: String(id),
			title: String(title),
			instructor: String(instructor),
			dept: String(dept),
		};

		//console.log(typeof sectionSfields.uuid)

		const [year, avg, pass, fail, audit] = this.mFields.map((mfield) => result[mfield]);

		const sectionMfields: Mfield = {
			year: Number(year),
			avg: Number(avg),
			pass: Number(pass),
			fail: Number(fail),
			audit: Number(audit),
		};

		const newSection: Section = new Section(sectionMfields, sectionSfields);
		//console.log(typeof newSection.getSfields().id)
		return newSection;
	}

	// REQUIRES: courseDataList: list of JSON files associated with course files and their accompanied name in a dataset
	// 							ex - dataset 'test3' containing the courses CPSC 110 --> {jSON FILE CPSC110, "CPSC 110"}
	//			 id: dataset id name
	// EFFECTS: takes the list of courses and writes them as a JSON file to be stored on to disk with the following directory:
	//			"./data/${id}/${ course name}.json"
	// OUTPUT: void
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

	// Counts the number of rows in a given dataset content and adds
	// public async countRows(content: string, id: string, datasets: Map<string, Section[]>): Promise<number> {
	// 	// Decode base64 string into buffer
	// 	const buffer = Buffer.from(content, "base64");
	//
	// 	// load buffer in JSZip -> zip file
	// 	const zip = await JSZip.loadAsync(buffer);
	//
	// 	// tracks number of sections in a given dataset and is initialized to 0
	// 	let numSections = 0;
	//
	// 	// where each promise is appended to for each course object
	// 	const allPromises = [];
	//
	// 	// iterates through each course
	// 	for (const key in zip.files) {
	// 		const name = key;
	//
	// 		// check that the file name contains courses at start AND is followed by at least one alpha-numeric char
	// 		// and that it doesn't an ending with a .(...)  (ex .png or .json or etc) indicative of an unwanted file type
	// 		if (name.match(/^courses\/\w/) && name.match(/^[^.]+$/)) {
	// 			const promiseContent = zip.files[key].async("string").then(async (content0) => {
	// 				//console.log('File Content:', content0);
	// 				// Parse JSON file in content
	// 				const jsonData = JSON.parse(content0);
	// 				//console.log('JSON FILE:', jsonData);
	//
	// 				// for cases where result:[] with no sections inside
	// 				if (jsonData.result.length === 0) {
	// 					return null;
	// 				}
	//
	// 				// 1) first create a list strings of our SFields and MFields string form to index into JSON object
	// 				// 2) retrieve value associated with field and store into appropriate Sfield variable
	// 				// 3) repeat steps with mfields
	// 				// 4) instantiate new section with mfields and sfields collected
	// 				// 5) store dataset info into our this.sectionsDataset
	//
	// 				// iterate through the sections of each course in the dataset
	// 				// Then filter the valid sections based on the required fields
	//
	// 				const validSectionsInCourse = this.filterValidSections(jsonData);
	//
	// 				jsonData.result = validSectionsInCourse;
	//
	// 				// turn all valid sections to Sections objects
	// 				validSectionsInCourse.forEach((section: any) => {
	// 					this.addNewSectionToDatabase(id, section, datasets);
	// 					numSections++;
	// 				});
	// 				return {name, jsonData};
	// 			});
	// 			allPromises.push(promiseContent);
	// 		}
	// 	}
	// 	const courseDataList = await Promise.all(allPromises);
	// 	await this.storeCoursesOnDisk(courseDataList, id);
	//
	// 	// after iterating through all courses in dataset, if no valid section -> throw error
	// 	if (numSections === 0) {
	// 		throw new InsightError("No valid section");
	// 	}
	//
	// 	return numSections;
	// }

	// REDUNDANT
	// public async countRowsInDataset(id: string): Promise<number> {
	// 	// where each promise is appended to for each course object
	// 	const allPromises: any[] = [];
	// 	const sections: Section[] = [];
	// 	let numSections: number = 0
	//
	// 	// list of all courses under the dataset file
	// 	const path = await fs.readdir(`./data/${id}/courses/`);
	// 	for (const course of path) {
	// 		const promise = fs
	// 			.readJson(`./data/${id}/courses/${course}`)
	// 			.then(async (file) => {
	// 				if (file.result.length === 0) {
	// 					return null;
	// 				}
	// 				const validSectionsInCourse = this.filterValidSections(file);
	// 				numSections += validSectionsInCourse.length
	// 			})
	// 			.catch((err) => {
	// 				throw err;
	// 			});
	//
	// 		allPromises.push(promise);
	// 	}
	// 	await Promise.all(allPromises);
	// 	return numSections
	// }
}
