// waves with frequency of 1
let saw = t => (t % 1) * 2 - 1;
let sin = t => Math.sin(2 * Math.PI * t);
let sqr = t => ((t * 2) & 1) * 2 - 1;
let tri = t => (t > .5 ? 1 - t : t) * 4 - 1;

// operators
const ADD = 0, SUB = 1, MUL = 2, DIV = 3, POW = 4;

const invSampleRate = 1 / sampleRate;

let waves = {
    "saw": saw, "sawtooth": saw,
    "sin": sin, "sine": sin,
    "sqr": sqr, "square": sqr,
    "tri": tri, "triangle": tri
};

function applyOperator(operator, input, waveValue) {
    switch (operator) {
        case ADD:
            return input + waveValue;
        case SUB:
            return input - waveValue;
        case MUL:
            return input * waveValue;
        case DIV:
            return input / waveValue;
        case POW:
            return input ** waveValue;
    }
}

class SynthProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: "frequency", defaultValue: 0 }
        ];
    }

    constructor() {
        super();

        this.wave = tri;
        this.t = 0;
        this.isProcessing = true;

        this.port.onmessage = e => {
            this.wave = waves[e.data.type];
            
            if (e.data.isProcessing != undefined)
                this.isProcessing = e.data.isProcessing;
        };
    }

    process(inputs, outputs, params) {
        let input = inputs[0][0];
        input = input ? input : [];
            
        for (let i = 0; i < 128; i++) {
            let freq = params.frequency.length > 1 ? params.frequency[i] : params.frequency[0];
            outputs[0][0][i] = this.wave(this.t);
            this.t += invSampleRate * freq; // because calculating t on its own leads to problems when modulating frequency
        }

        return this.isProcessing;
    }
}

class ValueProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: "value", defaultValue: 1 }
        ];
    }

    constructor() {
        super();

        this.isProcessing = true;

        this.port.onmessage = e => {
            if (e.data.isProcessing != undefined)
                this.isProcessing = e.data.isProcessing;
        };
    }

    process(inputs, outputs, params) {
        for (let i = 0; i < 128; i++)
            outputs[0][0][i] = params.value;

        return this.isProcessing;
    }
}

class OperationProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: "operator", defaultValue: -1 }
        ];
    }

    constructor() {
        super();

        this.isProcessing = true;

        this.port.onmessage = e => {
            if (e.data.isProcessing != undefined)
                this.isProcessing = e.data.isProcessing;
        };
    }

    process(inputs, outputs, params) {
        let in0 = inputs[0][0];
        in0 = in0 ? in0 : [];

        let in1 = inputs[1][0];
        in1 = in1 ? in1 : [];

        for (let i = 0; i < 128; i++) {
            if (params.operator >= 0)
                outputs[0][0][i] = applyOperator(params.operator[0], in0[i], in1[i]);
        }

        return this.isProcessing;
    }
}

registerProcessor('synth-processor', SynthProcessor);
registerProcessor('value-processor', ValueProcessor);
registerProcessor('operation-processor', OperationProcessor);