import {reactive} from 'vue';

export const store = reactive({
    jsonResult: {
        scanResults: null,
        testResults: null,
        parsedTestResults: [],
    },
    rootDir: '',
    safeDir: '',
    languageDetails: null,
    ruleFilePath: '',
    codeSampleFilePath: '',
    ruleEditorCode: {
        originalRule: '',
        normalizedRule: ''
    },
    codeEditorCode: '',
    codeEditorDebugLocation: null,
    mustNotMatchTestCases: [],
    disableBinaryRun: true,
});