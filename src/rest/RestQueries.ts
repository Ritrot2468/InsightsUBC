import {IInsightFacade} from "../controller/IInsightFacade";
import {Request, Response} from "express";

export default class RestQueries{
	private facade: IInsightFacade;
	constructor(facade: IInsightFacade) {
		this.facade = facade;
	}

	public async getAllAverageForACourse(req: Request, res: Response): Promise<void> {
		const courseDept = req.params.courseDept;
		const courseNum = req.params.courseNum;

		const result = this.facade.performQuery()

	}


}
