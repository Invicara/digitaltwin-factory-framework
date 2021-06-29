import React from 'react'
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import withStyles from "@material-ui/core/styles/withStyles";
import './RadioButtons.scss'

const RadioButtons = ({options, value, onChange, labelPlacement='end'}) => {

    const AccentRadio = withStyles({
        root: {
          '&$checked': {
            color: 'var(--app-accent-color)',
          },
        },
        checked: {},
      })((props) => <Radio color="default" {...props} />);

    return (
        <div className='ipa-radio-btns'>
            <FormControl component="fieldset">
                <RadioGroup row value={value} onChange={onChange}>
                    {options.map(o => <FormControlLabel value={o} control={<AccentRadio />} label={o} labelPlacement={labelPlacement} />)}
                </RadioGroup>
            </FormControl>
        </div>
    )

}

export default RadioButtons