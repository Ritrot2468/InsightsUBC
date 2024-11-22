import fs from "fs-extra";
import Section, { Mfield, Sfield } from "./Section";
import Log from "@ubccpsc310/folder-test/build/Log";

export interface DatasetRecord {
	id: string;
	sections: Section[];
}

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

	// REQUIRES: jsonData - parsed JSON Object of the result key in a given course file
	//
	// EFFECTS: Iterate through each section in a given course file and for each section obtain all the sfields and mfields
	// 			and checks that each section contains all the fields in the variable valid_fields, else filter out.
	//
	// OUTPUT: returns all the valid sections as a JSONObject.
	public filterValidSections(jsonData: any): any {
		const hasAllValidFields = (section: any, validFields: string[]): boolean => {
			const fieldKeys = Object.keys(section);
			return validFields.every((field) => fieldKeys.includes(field));
		};

		const validSectionsInCourse = jsonData.result.filter((section: any) =>
			hasAllValidFields(section, this.valid_fields)
		);
		return validSectionsInCourse;
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
		const path = await fs.readdir(`./data/${id}/courses/`).catch((err) => {
			Log.info(err);
			throw new Error("ZIP file missing courses directory");
		});
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
						this.turnOldCoursestoOverall(section, id, sections);
					});

					return { id, file };
				})
				.catch((err) => {
					Log.info(err);
					throw new Error("Invalid ZIP File: Missing courses directory");
				});

			allPromises.push(promise);
		}

		await Promise.all(allPromises);
		const datasetRecord: DatasetRecord = { id: id, sections: sections };
		return datasetRecord;
	}

	private turnOldCoursestoOverall(section: any, id: string, sections: Section[]): void {
		if (section.Section === "overall") {
			const newSection = this.createSection(section, id);
			newSection.setMfield(newSection.getMFieldIndex("year"), SectionsParser.OVERALL_SECTION_YEAR);
			newSection.year = SectionsParser.OVERALL_SECTION_YEAR;
			sections.push(newSection);
		} else {
			sections.push(this.createSection(section, id));
		}
	}

	// REQUIRES: jsonData - parsed JSON Object of a valid section from the result key in a given course file
	// EFFECTS: Retrieves the fields of the section and populate the values of the sfields and mfields into a Section object
	// OUTPUT: newly populated and created Section object
	private createSection(jsonData: any, setId: string): Section {
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

		const newSection: Section = new Section(setId, sectionMfields, sectionSfields);
		//console.log(typeof newSection.getSfields().id)
		return newSection;
	}
}
