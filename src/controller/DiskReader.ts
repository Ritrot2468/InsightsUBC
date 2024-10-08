import Section, {InsightDatasetKind, InsightResult} from "./IInsightFacade";
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
	private currIDs: string[];
	private datasets: Map<string, InsightResult>

	constructor(sectionDatabase: Map<string, Section[]>, currIDs: string[], datasets: Map<string, InsightResult>) {

		this.sp = new SectionsParser();
		this.secDatabase = sectionDatabase;
		this.currIDs = currIDs;
		this.datasets = datasets;
	}

	// REQUIRES: currDatasets- array of all the dataset ids currently added in InsightFacade instance
	// EFFECTS: loads the list of dataset ids currently on disk and finds the dataset ids not in currDatasets
	// OUTPUT: returns list of dataset ids on disk not found in currently added datasets
	public async findDatasetsNotAdded(currDatasetIDs: string[]): Promise<string[]> {
		const missingData: string[] = [];
		const allDataset = await fs.readdir("./data");
		allDataset.map((dataset) => {
			//console.log(dataset)
			if (!currDatasetIDs.includes(dataset)) {
				missingData.push(dataset);
			}
		});
		//console.log(missingData)
		return missingData;
	}

	// REQUIRES: currDatasets - array of all the dataset ids currently added in InsightFacade instance
	// EFFECTS: finds all datasets in disks not in current datasets and returns a map of the datasets with their id (dataset name)
	// and associated sections
	// datasetsIds = all currently added datasets (refer to currIDs),
	public async mapMissingSections(): Promise<Map<string, Section[]>> {
		//const missingDatasets = new Map<string, Section[]>();
		const allPromises: Promise<DatasetRecord>[] = [];
		// the id of all datasets not currently added
		const missingDatasetsID = await this.findDatasetsNotAdded(this.currIDs);

		missingDatasetsID.forEach((setId) => {
			// all ids for missing datasets are returned as a Record
			// with all the sections associated with the id
			const promise = this.sp.turnDatasetToSection(setId);
			this.currIDs.push(setId);
			allPromises.push(promise);
		});
		const records = await Promise.all(allPromises);

		missingDatasetsID.forEach((setID) => {
				const newRecord: InsightResult = {
					[InsightDatasetKind.Sections]: this.secDatabase.get(setID)?.length as number
				}
				this.datasets.set(setID, newRecord);
			}
		)
		// add all records collected to Map
		records.forEach((record) => {
			this.secDatabase.set(record.id, record.sections);
		});

		return this.secDatabase;
	}
}
