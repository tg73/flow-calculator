import { useStore } from "../stores/store";
import FileSaver from 'file-saver';

export default function ExportOptionsHandler() {
    const options = useStore((state) => state.options);
    const fileName = useStore((state) => state.exportOptionsFileName);
    
    const saveOptionsAs = () => {
        const fileObj = { id: `flow-calculator-options`, options: options };

        const fileBlob = new Blob( [JSON.stringify(fileObj)], {type: "application/json"});

        let useFileName = fileName || options.model;

        const datestamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').replace(/\..+/, '')
        useFileName = `${useFileName ? useFileName.replace(/[/\\?%*:|"<> ]/g, '_') + '-' : ''}options-${datestamp}.json`;
    
        FileSaver.saveAs(fileBlob, useFileName);
    }

    return saveOptionsAs;
}
