import {reactive} from 'vue';

export const store = reactive({
    jsonResult: {
        scanResults: null,
        testResults: null,
        parsedTestResults: [],
    },
    rootDir: '',
    safeDir: '',
    findingsPath: '',
    languageDetails: null,
    ruleFilePath: '',
    codeSampleFilePath: '',
    ruleEditorCode: '',
    codeEditorCode: '',
    codeEditorDebugLocation: null,
    mustNotMatchTestCases: [],
    history: [],
    disableBinaryRun: true,
});