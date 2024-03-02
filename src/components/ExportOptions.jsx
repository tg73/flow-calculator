import { useStore } from "../stores/store";
import { Input } from './Inputs';
import { Button } from './Buttons';
import ExportOptionsHandler from "../utils/exportOptions";

export default function ExportOptions() {
    const exportOptions = ExportOptionsHandler();
    const fileName = useStore((state) => state.exportOptionsFileName);
    const setFileName = useStore((state) => state.setExportOptionsFileName);

    return (
        <>
            <Input type="text" value="fileName" defaultValue={fileName} label="Export Options File Name (Optional)" handleChange={(e) => {setFileName(e.target.value)}} />
            <Button label="Export Options" bgColors="bg-indigo-700 hover:bg-indigo-800" handleClick={() => exportOptions()} />
        </>
    )
}