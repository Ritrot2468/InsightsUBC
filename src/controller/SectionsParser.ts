import JSZip from "jszip";
import Section, {InsightError, Mfield, Sfield} from "./IInsightFacade";
import fs from "fs-extra";

export default class SectionsParser{
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

	// Keep order of mFields and sFields according to chart found in Section Specification sheet
	// for consistency
	public mFields: string[] = ["Year", "Avg", "Pass", "Fail", "Audit"];

	public sFields: string[] = ["id", "Course", "Title", "Professor", "Subject"];

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
	public async countRows(content: string, id: string, datasets: Map<string, Section[]>): Promise<number> {
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
						this.addNewSection(id, section, datasets);
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

	// helper function to create and add new section sections_database
	private addNewSection(section_id: string, jsonData: any, datasets:  Map<string, Section[]>): void {
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
		if (id in datasets) {
			datasets.get(section_id)?.push(newSection);
		} else {
			datasets.set(section_id, [newSection]);
		}
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

}
