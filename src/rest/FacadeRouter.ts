import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import InsightFacade from "../controller/InsightFacade";
import { IInsightFacade, InsightDatasetKind, NotFoundError } from "../controller/IInsightFacade";
import Log from "@ubccpsc310/folder-test/build/Log";

const facade: IInsightFacade = new InsightFacade();

export default class FacadeRouter {
	// // private facade: InsightFacade
	// constructor() {
	// 	this.restQueries = new RestQueries(facade);
	// }
	public async putDataset(req: Request, res: Response): Promise<void> {
		const id = req.params.id;
		const kind = req.params.kind as InsightDatasetKind;
		Log.info("id: ", id);

		try {
			if (!id || !kind) {
				throw new Error("Missing required parameters");
			}

			if (!req.body) {
				throw new Error("No file uploaded");
			}
			const content = req.body.toString("base64");
			const result = await facade.addDataset(id, content, kind);
			res.status(StatusCodes.OK).json({ result: result });
		} catch (err: any) {
			res.status(StatusCodes.BAD_REQUEST).json({ error: err.message });
		}
	}

	public async removeDataset(req: Request, res: Response): Promise<void> {
		const id = req.params.id;

		try {
			const result = await facade.removeDataset(id);
			res.status(StatusCodes.OK).json({ result: result });
		} catch (error: any) {
			if (error instanceof NotFoundError) {
				res.status(StatusCodes.NOT_FOUND).json({ error: error.message });
			} else {
				res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
			}
		}
	}

	public async listDatasets(req: Request, res: Response): Promise<void> {
		Log.info("Retrieving Datasets");
		Log.info("No req", req);
		const result = await facade.listDatasets();

		res.status(StatusCodes.OK).json({ result: result });
		Log.info("Response sent with status OK");
	}

	public async queryDatasets(req: Request, res: Response): Promise<void> {
		const query: any = req.body;
		//console.log("Query:", query);
		try {
			const result = await facade.performQuery(query);
			res.status(StatusCodes.OK).json({ result: result });
		} catch (error: any) {
			res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
		}
	}
	// public async getAllAverageForACourse(req: Request, res: Response): Promise<void> {
	// 	const courseDept = req.params.courseDept;
	// 	const courseNum = req.params.courseNum;
	// 	const setId = req.params.setId;
	// 	const query = `{
	//     "WHERE": {
	//         "AND": [
	//             {"IS": {"${setId}_dept": "${courseDept}"}},
	//             {"IS": {"${setId}_id": "${courseNum}"}}
	//         ]
	//     },
	//     "OPTIONS": {
	//         "COLUMNS": ["${setId}_year", "averageGrades"],
	//         "ORDER": "${setId}_year"
	//     },
	//     "TRANSFORMATIONS": {
	//         "GROUP": ["${setId}_year"],
	//         "APPLY": [
	//             {"averageGrades": {"AVG": "${setId}_avg"}}
	//         ]
	//     }
	// }`;
	// 	facade.performQuery(query).then( result => {
	// 		console.log(query)
	// 		Log.info("Result: ", result);
	// 		res.status(StatusCodes.OK).json({message: "Dataset added", result});
	// 		return res;
	// 	}).catch(err => {
	// 		Log.error("Error: ", err.msg);
	// 		res.status(StatusCodes.BAD_REQUEST).json({message: "Query Error", err});
	// 	})
	//
	// }
}
