import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
//import multer from 'multer';
import InsightFacade from "../controller/InsightFacade";
import {IInsightFacade, InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
// import path from 'path';
// import fs from "fs";
const facade: IInsightFacade = new InsightFacade()

// const app = express();
//
// const upload = multer({dest: 'uploads/'})
//
// app.post('/dataset/id:/kind:', upload.single('file'), (req: Request, res: Response) => {
// 	const id = req.params.id;
// 	const kind = req.params.kind as InsightDatasetKind;
// 	if (!req.file) {
// 		return res.status(StatusCodes.BAD_REQUEST).json({
// 			error: 'No file uploaded'
// 		})
// 	}
// 	const filePath = path.resolve(req.file.path);
//
// 	const fileBuffer = fs.readFileSync(filePath);
// 	const content = fileBuffer.toString('base64');
// 	fs.unlinkSync(filePath);
// 	facade.addDataset(id, content, kind)
// 		.then((result) => {
// 			res.status(StatusCodes.CREATED).json({message: "Dataset added", result});
// 		}).catch((err) => {
// 		res.status(StatusCodes.BAD_REQUEST).json({err: `404 Error, ${err}`});
// 	})
//
// })
export default class FacadeRouter {
	// private facade: InsightFacade
	// constructor() {
	// 	this.facade = new InsightFacade();
	// }
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
			const result = await facade.removeDataset(id)
			res.status(StatusCodes.OK).json({message: "Dataset removed", result});

		} catch (err) {
			res.status(StatusCodes.BAD_REQUEST).json({err: `404 Error, ${err}`});
		}
	}

	public async listDataset( res: Response): Promise<void> {

		try {
			const result = await facade.listDatasets();
			res.status(StatusCodes.OK).json({message: "Dataset List", result});

		} catch (err) {
			res.status(StatusCodes.BAD_REQUEST).json({err: `404 Error, ${err}`});
		}
	}


}
