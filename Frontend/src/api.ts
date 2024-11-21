import Log from "@ubccpsc310/folder-test/build/Log";
import { InsightResult } from "../../src/controller/IInsightFacade";

async function fetchDatasets(): Promise<any> {
	const response = await fetch("http://localhost:4321/datasets");
	if (!response.ok) {
		throw new Error("Failed to fetch datasets.");
	}
	Log.info(response);
	return response.json();
}

async function deleteDataset(id: string): Promise<any> {
	try {
		const response = await fetch(`http://localhost:4321/dataset/${id}`, {
			method: "DELETE",
		});

		return response.json();
	} catch (error) {}
}

async function queryDataset(query: Object): Promise<any> {
	console.log(JSON.stringify(query));
	const response = await fetch("http://localhost:4321/query", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(query),
	});

	//console.log(response.json());

	if (!response.ok) {
		throw new Error("Failed to query dataset.");
	}

	return response.json();
}

export { fetchDatasets, deleteDataset, queryDataset };
