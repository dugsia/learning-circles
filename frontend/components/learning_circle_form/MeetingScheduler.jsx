import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { render } from 'react-dom';
import { RRule, RRuleSet, rrulestr } from 'rrule'
import DayPicker, { DateUtils } from 'react-day-picker';
import Modal from 'react-responsive-modal';
import moment from 'moment'

import {
  InputWithLabel,
  TimePickerWithLabel,
  DatePickerWithLabel,
  TimeZoneSelect,
  SelectWithLabel,
} from 'p2pu-components'

import 'react-day-picker/lib/style.css';

/*

Notes about dates
=================

- the DB stores local dates as a date string formatted as YYYY-MM-DD
- the DayPicker (calendar) displays local dates
- dates need to be converted to UTC for rrule

*/


const weekdays = [
  { label: 'Sunday', value: RRule.SU },
  { label: 'Monday', value: RRule.MO },
  { label: 'Tuesday', value: RRule.TU },
  { label: 'Wednesday', value: RRule.WE },
  { label: 'Thursday', value: RRule.TH },
  { label: 'Friday', value: RRule.FR },
  { label: 'Saturday', value: RRule.SA },
]

const defaultRecurrenceRules = {
  meeting_count: 6,
  frequency: 'weekly',
}

class MeetingScheduler extends React.Component {
  constructor(props) {
    super(props)
    this.initialState = {
      pattern: 'Custom selection',
      showModal: false,
      recurrenceRules: defaultRecurrenceRules,
      timeoutId: null,
      suggestedDates: []
    }
    this.state = this.initialState
  }

  // componentDidUpdate(prevProps) {
  //   if (this.props.learningCircle.start_date && prevProps.learningCircle.start_date !== this.props.learningCircle.start_date) {
  //     const date = this.props.learningCircle.start_date

  //     if (/\d{4}-\d{2}-\d{2}/.test(date)) {
  //       if (this.state.timeoutId) {
  //         // the native date input pads the month and days with 0
  //         // so when typing in a double digit date the first digit of would match the regex
  //         // this timeout gives the user time to finish typing the date before opening the modal
  //         window.clearTimeout(this.state.timeoutId)
  //       }

  //       const timeoutId = window.setTimeout(() => {
  //         const localDate = this.dbDateStringToLocalDate(date)
  //         const weekday = weekdays[localDate.getDay()] ? [weekdays[localDate.getDay()].value] : null;
  //         this.setState({
  //           ...this.state,
  //           showModal: true,
  //           recurrenceRules: {
  //             ...this.state.recurrenceRules,
  //              weekday: weekday
  //           }
  //         }, this.props.updateFormData({ meetings: [ date ] }))
  //       }, 1000)

  //       this.setState({ timeoutId })
  //     }

  //   }
  // }

  // date conversion utils

  localDateToUtcDate = (localDate) => {
    const utcDate = new Date(Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate(), localDate.getUTCHours(), localDate.getUTCMinutes()))
    return utcDate
  }

  dateObjectToStringForDB = (date) => {
    const year = date.getFullYear()
    const month = `0${date.getMonth() + 1}`.slice(-2)
    const day = `0${date.getDate()}`.slice(-2)

    return `${year}-${month}-${day}`
  }

  dbDateStringToLocalDate = (dateStr, timeStr="00:00") => {
    const [year, month, day] = dateStr.split('-')
    const [hour, minute] = timeStr.split(':')
    const date = new Date(year, month-1, day, hour, minute)

    return date
  }

  dbDateStringToUtcDate = (dateStr, timeStr="00:00") => {
    const [year, month, day] = dateStr.split('-')
    const [hour, minute] = timeStr.split(':')
    const date = new Date(Date.UTC(year, month-1, day, hour, minute))

    return date
  }

  meetingsToOrderedDates = (meetings) => {
    const dates = meetings.map(m => this.dbDateStringToLocalDate(m))
    return dates.sort((a,b) => (a - b))
  }

  // recurrence modal functions

  openModal = () => this.setState({ ...this.state, showModal: true })
  closeModal = () => this.setState({ ...this.state, showModal: false })

  generateMeetings = () => {
    const { learningCircle } = this.props;
    const { recurrenceRules } = this.state;

    if (!learningCircle['start_date']) { return }

    const formattedStartDate = learningCircle['start_date']
    const timeString = learningCircle['meeting_time']
    const startDate = this.dbDateStringToLocalDate(formattedStartDate, timeString)
    const utcDate = this.localDateToUtcDate(startDate)

    let opts = {
      dtstart: utcDate,
      count: parseInt(recurrenceRules.meeting_count),
    }

    if (recurrenceRules.frequency === 'weekly') {
      opts.freq = RRule.WEEKLY
      opts.interval = 1
      opts.byweekday = recurrenceRules.weekday
    } else if (recurrenceRules.frequency === 'biweekly') {
      opts.freq = RRule.WEEKLY
      opts.interval = 2
      opts.byweekday = recurrenceRules.weekday
    }

    const rule = new RRule(opts)
    const recurringMeetings = rule.all()
    const pattern = rule.toText()
    const meetingDates = recurringMeetings.map(m => this.dateObjectToStringForDB(m))

    this.setState({
      suggestedDates: meetingDates,
      pattern: pattern
    })
  }


  // input handlers

  handleChange = (newContent) => {
    this.props.updateFormData(newContent)
  }

  handleRRuleChange = newContent => {
    this.setState({
      ...this.state,
      recurrenceRules: {
        ...this.state.recurrenceRules,
        ...newContent
      }
    })
  }

  handleDayClick = (day, { selected, disabled }) => {
    if (disabled) {
      return;
    }
    const selectedDays = [...this.props.learningCircle.meetings]
    const isFirstDate = selectedDays.length === 0

    if (isFirstDate) {
      const formattedDate = this.dateObjectToStringForDB(day)
      this.props.updateFormData({ start_date: formattedDate, meetings: [formattedDate] })

      const weekday = weekdays[day.getDay()] ? [weekdays[day.getDay()].value] : null;
      this.setState({
        ...this.state,
        recurrenceRules: {
          ...this.state.recurrenceRules,
           weekday: weekday
        }
      }, () => this.generateMeetings())

    } else {
      const formattedDate = this.dateObjectToStringForDB(day)
      const selectedIndex = selectedDays.findIndex(meeting =>
        meeting === formattedDate
      );

      if (selectedIndex >= 0) {
        selectedDays.splice(selectedIndex, 1);
      } else {
        selectedDays.push(formattedDate);
      }

      const meetingDates = this.meetingsToOrderedDates(selectedDays)
      const formattedStartDate = this.dateObjectToStringForDB(meetingDates[0])
      this.props.updateFormData({ start_date: formattedStartDate })

      this.setState({
        ...this.state,
        pattern: 'Custom selection'
      });

      this.props.updateFormData({ meetings: selectedDays })
    }
  }

  clearDates = () => {
    this.setState({ ...this.state, pattern: 'Custom selection', recurrenceRules: defaultRecurrenceRules })
    this.props.updateFormData({ "start_date": '', meetings: [] })
  }

  clearSuggestedDates = () => {
    this.setState({ ...this.state, pattern: 'Custom selection', suggestedDates: [] })
  }

  useSuggestedDates = () => {
    this.props.updateFormData({ meetings: this.state.suggestedDates })
    this.setState({ ...this.state, suggestedDates: [] })
  }

  deleteMeeting = (date) => {
    const meetings = [...this.props.learningCircle.meetings]
    const formattedDate = this.dateObjectToStringForDB(date)
    const selectedIndex = meetings.findIndex(m =>
      m === formattedDate
    );

    if (selectedIndex >= 0) {
      meetings.splice(selectedIndex, 1);
    }

    this.props.updateFormData({ meetings })
    this.setState({ ...this.state, pattern: 'Custom selection' })
  }

  render() {
    const { clearDates, openModal, closeModal, handleChange, handleRRuleChange, handleDayClick, generateMeetings, dbDateStringToLocalDate, useSuggestedDates, clearSuggestedDates, deleteMeeting } = this;
    const { pattern, showModal, recurrenceRules, suggestedDates } = this.state;
    const { learningCircle, errors, updateFormData } = this.props;
    const { meetings, start_date } = learningCircle;

    const selectedDates = meetings.map(m => dbDateStringToLocalDate(m, learningCircle.meeting_time))
    const displayMeetings = selectedDates.concat(suggestedDates)

    let reminderWarning = null;
    let minDate = new Date;
    let minTime = null;

    const modifiers = {
      suggested: (d) => {
        const date = this.dateObjectToStringForDB(d)
        return suggestedDates.includes(date) && !meetings.includes(date)
      },
    };

    if (learningCircle.draft == false ){
      let {start_date, meeting_time} = this.props;
      let start_datetime = moment(learningCircle.start_datetime);
      let plus4Days = moment().add(4, 'days');
      let plus2Days = moment().add(2, 'days');

      if (start_datetime && start_datetime.isBefore(plus2Days)) {
        return (
          <div className='help-text'>
            <div className='content'>
              <p>Your learning circle has already started and you cannot set the date for the whole learning circle anymore. You can still add individual meetings or edit the date and time for meetings. To do this, go to your dashboard to add or edit meetings.</p>
            </div>
          </div>
        );
      }

      if (start_datetime && start_datetime.isBefore(plus4Days)){
        reminderWarning = (
          <div className="form-group">
            <p className="alert alert-warning">Your learning circle is starting in less than 4 days. A reminder has already been generated for the first meeting and will be regenerated if you update the date and/or time. Any edits you have made to the reminder will be lost.</p>
          </div>
        );
      }

      if (start_datetime && start_datetime.isSame(plus2Days, 'days')){
        minTime = meeting_time;
        // TODO time input doesn't support a range
      }

      minDate = plus2Days.toDate();

    }

    return(
      <div className="">
        {reminderWarning}

        <div className="meeting-scheduler mb-4">
          <div className="row calendar my-3">
            <div className="col-12 col-lg-6 d-flex justify-content-center" style={{ flex: '1 1 auto' }}>
              <DayPicker
                selectedDays={displayMeetings}
                onDayClick={handleDayClick}
                modifiers={modifiers}
              />
            </div>

            <div className="col-12 col-lg-6 d-flex justify-content-center">
              <div className="selected-dates p-4" style={{ paddingTop: '20px' }}>
                <label
                  htmlFor="selected-dates"
                  className='input-label left text-bold'
                >
                { `Selected dates (${selectedDates.length})` }
                </label>
                {
                  selectedDates.length > 1 &&
                  <p className="d-flex align-center">
                    <span className="material-icons" style={{ fontSize: '20px', paddingTop: '2px', paddingRight: '6px' }}>
                      date_range
                    </span>
                    <span className="capitalize" style={{ lineHeight: '1.5' }}>{pattern}</span>
                  </p>
                }
                <ul id="selected-dates" className="list-unstyled">
                  {
                    selectedDates.sort((a,b) => {
                      return a - b
                    }).map(date => {
                      return (
                        <li key={date.toString()} className="mb-2 selected-date">
                          {date.toLocaleString('default', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                          <button className="btn p2pu-btn ml-1" onClick={() => deleteMeeting(date)}>x</button>
                        </li>
                      )
                    })
                  }
                </ul>
              </div>
            </div>
          </div>
          { Boolean(suggestedDates.length) && <button className="p2pu-btn blue" onClick={useSuggestedDates}>Use suggested dates</button> }
          { Boolean(suggestedDates.length) && <button className="p2pu-btn dark" onClick={clearSuggestedDates}>Clear suggested dates</button> }
          <button className="p2pu-btn dark" onClick={clearDates}>Clear dates</button>
        </div>

        <TimePickerWithLabel
          label={'What time will your learning circle meet each week?'}
          handleChange={updateFormData}
          name={'meeting_time'}
          id={'id_meeting_time'}
          value={learningCircle.meeting_time}
          errorMessage={errors.meeting_time}
          required={true}
        />
        <TimeZoneSelect
          label={'What time zone are you in?'}
          value={learningCircle.timezone}
          latitude={learningCircle.latitude}
          longitude={learningCircle.longitude}
          handleChange={updateFormData}
          name={'timezone'}
          id={'id_timezone'}
          errorMessage={errors.timezone}
          required={true}
        />
        <InputWithLabel
          label={'How long will each session last (in minutes)?'}
          value={learningCircle.duration}
          handleChange={updateFormData}
          name={'duration'}
          id={'id_duration'}
          type={'number'}
          errorMessage={errors.duration}
          required={true}
          min={0}
        />

        <Modal open={showModal || false} onClose={closeModal} classNames={{modal: 'p2pu-modal', overlay: 'modal-overlay'}}>

          <div className="">
            <div className="mb-3 heading" role="heading"><h3>Recurring meetings</h3></div>
            <SelectWithLabel
              options={[
                { label: 'Monday', value: RRule.MO },
                { label: 'Tuesday', value: RRule.TU },
                { label: 'Wednesday', value: RRule.WE },
                { label: 'Thursday', value: RRule.TH },
                { label: 'Friday', value: RRule.FR },
                { label: 'Saturday', value: RRule.SA },
                { label: 'Sunday', value: RRule.SU }
              ]}
              name='weekday'
              value={recurrenceRules['weekday']}
              handleChange={handleRRuleChange}
              label="On which days will you meet?"
              isMulti={true}
              isClearable={false}
            />
            <SelectWithLabel
              options={[
                { label: 'Every week', value: 'weekly' },
                { label: 'Every 2 weeks', value: 'biweekly' },
              ]}
              name='frequency'
              value={recurrenceRules['frequency']}
              handleChange={handleRRuleChange}
              label="How often will you meet?"
              isClearable={false}
            />
            <InputWithLabel
              name="meeting_count"
              label="How many times will you meet?"
              value={recurrenceRules['meeting_count']}
              handleChange={handleRRuleChange}
              type={'number'}
            />
            <div className="d-flex justify-content-between buttons">
              <button className="p2pu-btn dark" onClick={closeModal}>Select custom dates</button>
              <button id="schedule-meetings-btn" className="p2pu-btn blue" onClick={generateMeetings}>Schedule meetings</button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }
}


MeetingScheduler.propTypes = {
  updateFormData: PropTypes.func.isRequired,
  learningCircle: PropTypes.object.isRequired,
  errors: PropTypes.object,
}

export default MeetingScheduler;

