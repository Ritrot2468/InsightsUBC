
import Log from "@ubccpsc310/folder-test/build/Log";
export const fetchDatasets = async (): Promise<any> => {
	const response = await fetch("http://localhost:4321/datasets");
	if (!response.ok) {
		throw new Error("Failed to fetch datasets.");
	}
	Log.info(response)
		return response.json()

};

export const deleteDataset = async (id: string): Promise<any> => {
	try {
		const response = await fetch(`http://localhost:4321/dataset/${id}`, {
			method: "DELETE"
		});

		return response.json()
	} catch (error)  {

	}
}
