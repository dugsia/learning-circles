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

import Alert from './Alert'

import 'react-day-picker/lib/style.css';

/*

Notes about dates
=================

- the database stores local dates as a date string formatted as YYYY-MM-DD, and meeting time separately as HH:MM.
- we parse that into Date objects in the create-learning-circle-page component
- we also convert the dates back into formatted strings when saving to the database
- this component only deals with Date objects
- the DayPicker (calendar) displays local dates
- dates need to be converted to UTC for rrule
- to avoid saving the DST time offset, when converting dates from UTC to local we reset the time to the meeting_time

*/

const MAX_MEETING_COUNT = 52
const MIN_MEETING_COUNT = 1
const DEFAULT_MEETING_COUNT = 6

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
  meeting_count: DEFAULT_MEETING_COUNT,
}

class MeetingScheduler extends React.Component {
  constructor(props) {
    super(props)
    this.initialState = {
      recurrenceRules: defaultRecurrenceRules,
      suggestedDates: []
    }
    this.state = this.initialState
  }

  componentDidUpdate(prevProps) {
    if (prevProps.learningCircle.meeting_time !== this.props.learningCircle.meeting_time) {
      if (Boolean(this.state.suggestedDates.length)) {
        this.generateSuggestedMeetings()
      }
      this.updateMeetingTime()
    }
  }


  // date conversion utils

  localDateToUtcDate = (localDate) => {
    const utcDate = new Date(Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate(), localDate.getUTCHours(), localDate.getUTCMinutes()))
    return utcDate
  }

  utcDateToLocalDate = (utcDate) => {
    let localDate = new Date(utcDate)

    // seems hacky but fixes the DST issue
    if (this.props.learningCircle.meeting_time) {
      const [hours, minutes] = this.props.learningCircle.meeting_time.split(":")
      localDate.setHours(hours)
      localDate.setMinutes(minutes)
    }

    return localDate
  }

  // recurrence rule functions

  generateSuggestedMeetings = () => {
    const { learningCircle } = this.props;
    const { recurrenceRules } = this.state;

    if (!learningCircle['start_date']) { return }
    const utcDate = this.localDateToUtcDate(learningCircle['start_date'])
    const count = parseInt(recurrenceRules.meeting_count) <= MAX_MEETING_COUNT && parseInt(recurrenceRules.meeting_count) >= MIN_MEETING_COUNT ? parseInt(recurrenceRules.meeting_count) : DEFAULT_MEETING_COUNT;

    let opts = {
      dtstart: utcDate,
      count: count,
      freq: RRule.WEEKLY,
      interval: 1,
      byweekday: recurrenceRules.weekday
    }

    const rule = new RRule(opts)
    const recurringMeetings = rule.all()
    const meetingDates = recurringMeetings.map(m => this.utcDateToLocalDate(m))

    this.setState({
      suggestedDates: meetingDates,
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
    }, this.generateSuggestedMeetings)
  }

  handleDayClick = (day, { selected, disabled }) => {
    if (disabled) {
      return;
    }
    const selectedDays = [...this.props.learningCircle.meetings]
    const isFirstDate = selectedDays.length === 0

    if (this.props.learningCircle.meeting_time) {
      const [hours, minutes] = this.props.learningCircle.meeting_time.split(":")
      day.setHours(hours)
      day.setMinutes(minutes)
    }

    if (isFirstDate) {
      this.props.updateFormData({ start_date: day, meetings: [day] })

      const weekday = weekdays[day.getDay()] ? weekdays[day.getDay()].value : null;
      this.setState({
        ...this.state,
        recurrenceRules: {
          ...this.state.recurrenceRules,
           weekday: weekday
        }
      }, this.generateSuggestedMeetings)

    } else {
      const selectedIndex = selectedDays.findIndex(meeting =>
        DateUtils.isSameDay(day, meeting)
      );

      if (selectedIndex >= 0) {
        selectedDays.splice(selectedIndex, 1);
      } else {
        selectedDays.push(day);
      }

      const meetingDates = selectedDays.sort((a,b) => (a - b))
      const startDate = meetingDates[0]
      this.props.updateFormData({ start_date: startDate, meetings: selectedDays, meets_weekly: false })
    }
  }

  updateMeetingTime = () => {
    const meetings = [...this.props.learningCircle.meetings].map(m => {
      const [hours, minutes] = this.props.learningCircle.meeting_time ? this.props.learningCircle.meeting_time.split(":") : [0,0]
      const newDate = new Date(m.getFullYear(), m.getMonth(), m.getDate(), hours, minutes)
      return newDate
    })

    this.props.updateFormData({ meetings: meetings })
  }

  clearDates = () => {
    this.setState({ ...this.state, recurrenceRules: defaultRecurrenceRules })
    this.props.updateFormData({ "start_date": '', meetings: [], meets_weekly: false })
  }

  clearSuggestedDates = () => {
    this.setState({ ...this.state, suggestedDates: [] })
  }

  useSuggestedDates = () => {
    this.props.updateFormData({ meetings: this.state.suggestedDates, meets_weekly: true })
    this.setState({ ...this.state, suggestedDates: [] })
  }

  deleteMeeting = (date) => {
    const meetings = [...this.props.learningCircle.meetings]
    const selectedIndex = meetings.findIndex(meeting =>
      DateUtils.isSameDay(date, meeting)
    );

    if (selectedIndex >= 0) {
      meetings.splice(selectedIndex, 1);
    }

    this.props.updateFormData({ meetings, meets_weekly: false })
  }

  render() {
    const { clearDates, handleChange, handleRRuleChange, handleDayClick, generateSuggestedMeetings, useSuggestedDates, clearSuggestedDates, deleteMeeting } = this;
    const { recurrenceRules, suggestedDates } = this.state;
    const { learningCircle, errors, updateFormData } = this.props;
    const { meetings, start_date } = learningCircle;

    const suggestedDatesArr = suggestedDates.filter(sd => !meetings.find(m => DateUtils.isSameDay(m, sd)))

    const selectedDates = meetings.sort((a,b) => { return a - b })
    const suggestedDatesObj = suggestedDatesArr.sort((a,b) => { return a - b })
    const displayMeetings = selectedDates.concat(suggestedDatesObj)
    const weekdayOption = weekdays.find((weekday) => weekday.value === recurrenceRules.weekday)
    const weekdayName = weekdayOption ? weekdayOption.label : null

    let reminderWarning = null;
    let minDate = new Date;
    let minTime = null;

    const modifiers = {
      suggested: (d) => {
        return suggestedDates.find(sg => DateUtils.isSameDay(sg,d)) && !meetings.find(m => DateUtils.isSameDay(m,d))
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

    let dateOpts = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }
    if (learningCircle.meeting_time) {
      dateOpts.hour = 'numeric'
      dateOpts.minute = '2-digit'
    }

    return(
      <div className="">
        {reminderWarning}

        <div className="meeting-scheduler mb-4">
          <div className="row calendar my-3">
            <div className="col-12 col-xl-6 d-flex justify-content-center" style={{ flex: '1 1 auto' }}>
              <div>
                <DayPicker
                  id="calendar"
                  selectedDays={displayMeetings}
                  onDayClick={handleDayClick}
                  modifiers={modifiers}
                  numberOfMonths={window.screen.width >= 1200 ? 2 : 1}
                />
              </div>
            </div>

            <div className="col-12 col-xl-6 d-flex flex-column">

              <div className="mb-2">
                <Alert show={Boolean(suggestedDates.length)} type="info" closeAlert={clearSuggestedDates}>
                  <p className="mb-2">
                    {`Suggested dates: Every ${weekdayName} for `}
                    <input
                      id="meeting-count"
                      name="meeting_count"
                      value={recurrenceRules['meeting_count']}
                      onChange={e => handleRRuleChange({ meeting_count: e.currentTarget.value })}
                      type={'number'}
                      min={MIN_MEETING_COUNT}
                      max={MAX_MEETING_COUNT}
                    />
                    {` weeks`}
                  </p>
                  <hr />
                  <p>Do you want to use the suggested dates? You can continue editing afterwards.</p>
                  <button id='clear-suggestions-btn' className="p2pu-btn transparent" onClick={clearSuggestedDates}>No</button>
                  <button id='accept-suggestions-btn' className="p2pu-btn dark" onClick={useSuggestedDates}>Yes</button>
                </Alert>
                { !Boolean(suggestedDates.length) && Boolean(selectedDates.length) && <button className="p2pu-btn dark d-flex align-items-center" onClick={clearDates}><span className="material-icons mr-1">clear_all</span>Clear dates</button> }
              </div>

                <div className="selected-dates p-4" style={{ paddingTop: '20px' }}>
                  <label
                    htmlFor="selected-dates"
                    className='input-label left text-bold'
                  >
                  { `Selected dates (${selectedDates.length})` }
                  </label>
                  <p>Click on the calendar to add or remove dates.</p>
                  <ul id="selected-dates" className="list-unstyled">
                    <React.Fragment>
                      {
                        selectedDates.map(date => {
                          return (
                            <li key={date.toString()} className="mb-2 selected-date">
                              {date.toLocaleString('default', dateOpts)}
                              <button className="btn p2pu-btn ml-1" onClick={() => deleteMeeting(date)}>x</button>
                            </li>
                          )
                        })
                      }
                      {
                        suggestedDatesObj.map(date => {
                          return (
                            <li key={date.toString()} className="mb-2 selected-date suggested-date">
                              {date.toLocaleString('default', dateOpts)}
                            </li>
                          )
                        })
                      }
                    </React.Fragment>
                  </ul>

              </div>
            </div>
          </div>
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

