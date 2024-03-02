import { useRef, useState } from 'react';
//import { useStore } from "../stores/store";
import { Error, Input } from './Inputs';
import { Button } from './Buttons';
import ImportOptionsHandler from "../utils/importOptions";

export default function ImportOptions() {
    const importOptions = ImportOptionsHandler();
    
    const inputRef = useRef();
    const [importOptionsError, setImportOptionsError] = useState("");
    const handleButtonClick = () => {
        importOptions(inputRef.current.files[0], setImportOptionsError)
    }

    return (
        <>
            <Input inputRef={inputRef} type="file" label="Import Options File Name" multiple={false} />
            <Button label="Import Options" bgColors="bg-indigo-700 hover:bg-indigo-800" handleClick={handleButtonClick}/>
            {importOptionsError && <Error msg={importOptionsError} />}
        </>
    )    
}