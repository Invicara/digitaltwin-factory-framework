const specialAttributes = [
    "<<TEXT>>", "<<DYNAMIC>>"
]

function processAttributes(attributes, hierAtts) {
  console.log(attributes)
    if (!attributes && !hierAtts) return [];
    
    if (!!attributes['_id']) delete attributes['_id'];
    if (!!attributes['_metadata']) delete attributes['_metadata'];
    
    let attKeys = Object.keys(attributes);
    let emptyAttributes = {};
    
    attKeys.forEach((att) => {
        
        //check to see if the attribute is a text or dynamic attribute
        if (specialAttributes.includes(attributes[att][0].toUpperCase())) {
            attributes[att] = attributes[att][0];
            emptyAttributes[att] = '';
        } 
        
        //for every other attrbiute
        else {
            emptyAttributes[att] = '';
        }
    });
    
    hierAtts.forEach((hAtt) => {
        emptyAttributes[hAtt] = '';
    })
    
    let orderedAttributes = {};
    attKeys.sort();
    
    attKeys.forEach((att) => {
        orderedAttributes[att] = attributes[att];
    });
    
    return {attributes: orderedAttributes, emptyAttributes: emptyAttributes};
    
};

function getDynamicKeys(attributes) {
    
    if (!attributes) return [];
    
    let attKeys = Object.keys(attributes);
    
    let dynamicKeys = attKeys.filter((att) => {
        return !Array.isArray(attributes[att]) && attributes[att] === specialAttributes[1];
    });
    
    if (dynamicKeys.length > 0) {
        
        return dynamicKeys;
        
    } else 
        return [];
}

function didDynamicChange(oldAttributes , newAttributes, dynamicKeys) {

    let didChange = false;
    
    for (var i = 0; i < dynamicKeys.length; i++) {
        if (oldAttributes[dynamicKeys[i]] !== newAttributes[dynamicKeys[i]]) {
            didChange = true;
            break;
        }
    }
    
    return didChange;
}

function cleanAttributes(attributes) {
    
    //clear out empty attributes in order to not send empty values to the queries
    let newAttributes = Object.assign(attributes);
    let keys = Object.keys(attributes);
    
    keys.forEach((key) => {

        if (Array.isArray(attributes[key] && attributes[key].length === 0))
            delete newAttributes[key];
        else if (!attributes[key])
            delete newAttributes[key];
    });
    
    return newAttributes;
}

let AttributeHelpers = {
    processAttributes: processAttributes,
    getDynamicKeys: getDynamicKeys,
    didDynamicChange: didDynamicChange,
    cleanAttributes: cleanAttributes
}

export default AttributeHelpers;