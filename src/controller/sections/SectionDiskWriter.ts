import fs from "fs-extra";
import JSZip from "jszip";
import SectionsParser from "./SectionsParser";
import { InsightDatasetKind } from "../IInsightFacade";
import Log from "@ubccpsc310/folder-test/build/Log";

export default class SectionDiskWriter extends SectionsParser {
	// Every SectionDiskWriter needs to be able to parse sections using SectionsParser

	constructor() {
		super();
	}

	public async logSectionsDatasetOnDisk(content: string, id: string): Promise<void> {
		const buffer = Buffer.from(content, "base64");
		const zip = await JSZip.loadAsync(buffer).catch((err) => {
			Log.info(err);
			throw new Error("Not a ZIP File");
		});
		await this.logSectionDataset(zip, id);
	}

	// REQUIRES: zip - current dataset content as a JSZIP
	// 			  id - name of dataset
	// EFFECTS: parses the JSZIP files in the dataset and sorts through each JSON file containing each course, then
	// 			parses the JSON object to obtain the 'result' object and finds all sections,
	//          filters only valid sections,
	//          write the valid sections with the associated dataset id onto the disk
	// OUTPUT: void
	private async logSectionDataset(zip: JSZip, id: string): Promise<void> {
		const allPromises = [];

		for (const key in zip.files) {
			const name = key;

			if (name.match(/^courses\/\w/) && name.match(/^[^.]+$/)) {
				if (!zip.files[key]) {
					throw new Error("Missing courses directory");
				}
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

	// Writes InsightDataset info about a dataset
	public async logInsightKindToDisk(id: string, kind: InsightDatasetKind, numRows: number): Promise<void> {
		const obj = {
			table: [{ id, kind, numRows }],
		};
		//obj.table.push({id: id, kind: kind, numRows: numRows} as never);
		const json = JSON.stringify(obj);
		await fs.outputFile(`./data/${id}/kind`, json);
	}

	// REQUIRES: courseDataList: list of JSON files associated with course files and their accompanied name in a dataset
	// 							ex - dataset 'test3' containing the courses CPSC 110 --> {jSON FILE CPSC110, "CPSC 110"}
	//			 id: dataset id name
	// EFFECTS: takes the list of courses and writes them as a JSON file to be stored on to disk with the following directory:
	//			"./data/${id}/${ course name}.json"
	// OUTPUT: void
	public async storeCoursesOnDisk(
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
