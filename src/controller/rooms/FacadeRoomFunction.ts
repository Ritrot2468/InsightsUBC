import DatasetValidatorHelper from "../DatasetValidatorHelper";
import RoomDiskReader from "./RoomDiskReader";
import RoomDiskWriter from "./RoomDiskWriter";

export default class FacadeRoomFunction{

	private sv: DatasetValidatorHelper;
	private roomDiskReader: RoomDiskReader;
	private roomDiskWriter: RoomDiskWriter;

	constructor() {
		this.sv = new DatasetValidatorHelper();
		this.roomDiskReader = new RoomDiskReader();
		this.roomDiskWriter = new RoomDiskWriter();
		// initialize dictionary for the fields
	}
}
