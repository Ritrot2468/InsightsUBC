import Section from "./IInsightFacade";
import fs from "fs-extra";
import SectionsParser from "./SectionsParser";

// data type to store dataset id and associated sections as a key value pair
export interface DatasetRecord {
	id: string;
	sections: Section[];

}

export default class DiskReader {
	private sp: SectionsParser;
	private secDatabase: Map<string, Section[]>;

	constructor(sectionDatabase: Map<string, Section[]>) {
		this.sp = new SectionsParser();
		this.secDatabase = sectionDatabase;
	}

	// REQUIRES: currDatasets- array of all the dataset ids currently added in InsightFacade instance
	// EFFECTS: loads the list of dataset ids currently on disk and finds the dataset ids not in currDatasets
	// OUTPUT: returns list of dataset ids on disk not found in currently added datasets
	public async findDatasetsNotAdded(currDatasetIDs: string[]): Promise<string[]> {
		const missingData: string[] = [];
		const allDataset = await fs.readdir("./data");
		allDataset.map((dataset) => {
			if (!currDatasetIDs.includes(dataset)) {
				missingData.push(dataset);
			}
		});
		return missingData;
	}

	// REQUIRES: currDatasets - array of all the dataset ids currently added in InsightFacade instance
	// EFFECTS: finds all datasets in disks not in current datasets and returns a map of the datasets with their id (dataset name)
	// and associated sections
	// datasetsIds = all currently added datasets (refer to currIDs),
	public async mapMissingSections(currIDs: string[]): Promise<Map<string, Section[]>> {
		const allPromises: Promise<DatasetRecord>[] = [];
		// the id of all datasets not currently added

		currIDs.forEach((setId) => {
			// all ids for missing datasets are returned as a Record
			// with all the sections associated with the id
			const promise = this.sp.turnDatasetToSection(setId);
			allPromises.push(promise);
		});

		const records = await Promise.all(allPromises);
		// add all records collected to Map
		records.forEach((record) => {
			this.secDatabase.set(record.id, record.sections);
		});

		return this.secDatabase;
	}
}
