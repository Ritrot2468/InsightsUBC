//import fetch from "node-fetch";
import {InsightDataset} from "../../src/controller/IInsightFacade";
export const fetchDatasets = async (): Promise<any> => {
	const response = await fetch("http://localhost:4321/datasets");
	if (!response.ok) {
		throw new Error("Failed to fetch datasets.");
	}
		return response.json()

};

export const addDatasetToUI = async (id: string): Promise<any> => {
	try {
		const response = await fetch(`http://localhost:4321/dataset/${id}/sections`, {
			method: "PUT"
		});
		if (!response.ok) {
			throw new Error("Failed to add dataset.");
		}

		return response.json()
	} catch (error)  {

	}
}
