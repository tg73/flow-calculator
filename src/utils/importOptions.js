import { useStore } from "../stores/store";

export default function ImportOptionsHandler() {
    const options = useStore((state) => state.options);
    const setOptions = useStore((state) => state.setOptions);

    const importOptions = (blob, setImportOptionsError) => {
        if (!blob )
        {
            setImportOptionsError(`Select an options file first.`);
            return;
        }

        var fr = new FileReader();
        try {
            fr.readAsText(blob);
        }
        catch (err) {
            console.log(err); setImportOptionsError(`Unable to read file: ${err}`);
            return;
        }

        fr.onload = () => {
            try {
                let parsed = JSON.parse(fr.result);
                if ( parsed.id != `flow-calculator-options` || typeof(parsed.options) != `object` ) {
                    setImportOptionsError("Not a valid flow-calculator options file.");
                }
                else {
                    setImportOptionsError(``);
                    setOptions(parsed.options);
                    // TODO: the main form does not update following setOptions. At present
                    // I don't know how to trigger an update, other than by reload, which is not ideal.
                    location.reload();
                }
            }
            catch(err) { 
                console.log(err); setImportOptionsError(`Unable to parse options: ${err}`) 
            } 
        }

        fr.onerror = () => {
            setImportOptionsError(`Unable to load options: ${fr.error}`);
        }
    }

    return importOptions;
}
