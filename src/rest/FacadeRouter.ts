import { Request, Response} from "express";
import { StatusCodes } from "http-status-codes";

import InsightFacade from "../controller/InsightFacade";
import {IInsightFacade, InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
import Log from "@ubccpsc310/folder-test/build/Log";
import RestQueries from "./RestQueries";

const facade: IInsightFacade = new InsightFacade()

export default class FacadeRouter {
	// private facade: InsightFacade
	private restQueries: RestQueries;
	constructor() {
		this.restQueries = new RestQueries(facade);
	}
	public async putDataset(req: Request, res: Response): Promise<void> {
		const id = req.params.id;
		const kind = req.params.kind as InsightDatasetKind;

		try {
			if (!id || !kind) {
				throw new Error("Missing required parameters");
			}

			if (!req.body) {
				throw new Error("No file uploaded");
			}
			const content = req.body.toString("base64");
			const result = await facade.addDataset(id, content, kind)
			res.status(StatusCodes.OK).json({message: "Dataset added", result});

		} catch (err: any) {
			if (err instanceof InsightError) {
				res.status(StatusCodes.BAD_REQUEST).json({err: "InsightError", message: err.message});
			} else {
				res.status(StatusCodes.BAD_REQUEST).json({err: "Error", message: err.message});
			}
		}

	}

	public async removeDataset(req: Request, res: Response): Promise<void> {
		const id = req.params.id;

		try {
			if (!id) {
				throw new Error("Dataset ID is required");
			}

			const result = await facade.removeDataset(id)
			res.status(StatusCodes.OK).json({message: "Dataset removed", result});

		} catch (err) {
			res.status(StatusCodes.BAD_REQUEST).json({err: `400 Error, ${err}`});
		}
	}

	public async listDatasets(req: Request, res: Response): Promise<void> {
			Log.info("Retrieving Datasets")
			Log.info("No req", req);
			const result = await facade.listDatasets();

			res.status(StatusCodes.OK).json({result: result});
			Log.info("Response sent with status OK");
	}



}
