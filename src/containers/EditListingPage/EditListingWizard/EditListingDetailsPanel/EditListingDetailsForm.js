import React from 'react';
import { arrayOf, bool, func, shape, string } from 'prop-types';
import { compose } from 'redux';
import { Field, Form as FinalForm } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import classNames from 'classnames';

// Import util modules
import { intlShape, injectIntl, FormattedMessage } from '../../../../util/reactIntl';
import { EXTENDED_DATA_SCHEMA_TYPES, propTypes } from '../../../../util/types';
import { maxLength, required, composeValidators } from '../../../../util/validators';

// Import shared components
import { Form, Button, FieldSelect, FieldTextInput, Heading } from '../../../../components';
// Import modules from this directory
import CustomExtendedDataField from '../CustomExtendedDataField';
import css from './EditListingDetailsForm.module.css';

const TITLE_MAX_LENGTH = 60;

// Show various error messages
const ErrorMessage = props => {
  const { fetchErrors } = props;
  const { updateListingError, createListingDraftError, showListingsError } = fetchErrors || {};
  const errorMessage = updateListingError ? (
    <FormattedMessage id="EditListingDetailsForm.updateFailed" />
  ) : createListingDraftError ? (
    <FormattedMessage id="EditListingDetailsForm.createListingDraftError" />
  ) : showListingsError ? (
    <FormattedMessage id="EditListingDetailsForm.showListingFailed" />
  ) : null;

  if (errorMessage) {
    return <p className={css.error}>{errorMessage}</p>;
  }
  return null;
};

// Hidden input field
const FieldHidden = props => {
  const { name } = props;
  return (
    <Field id={name} name={name} type="hidden" className={css.unitTypeHidden}>
      {fieldRenderProps => <input {...fieldRenderProps?.input} />}
    </Field>
  );
};

// Field component that either allows selecting listing type (if multiple types are available)
// or just renders hidden fields:
// - listingType              Set of predefined configurations for each listing type
// - transactionProcessAlias  Initiate correct transaction against Marketplace API
// - unitType                 Main use case: pricing unit
const FieldSelectListingType = props => {
  const { name, listingTypes, hasExistingListingType, onProcessChange, formApi, intl } = props;
  const hasMultipleListingTypes = listingTypes?.length > 1;

  const handleOnChange = value => {
    const transactionProcessAlias = formApi.getFieldState('transactionProcessAlias')?.value;
    const selectedListingType = listingTypes.find(config => config.listingType === value);
    formApi.change('transactionProcessAlias', selectedListingType.transactionProcessAlias);
    formApi.change('unitType', selectedListingType.unitType);

    const hasProcessChanged =
      transactionProcessAlias !== selectedListingType.transactionProcessAlias;
    if (onProcessChange && hasProcessChanged) {
      onProcessChange(selectedListingType.transactionProcessAlias);
    }
  };

  return hasMultipleListingTypes && !hasExistingListingType ? (
    <>
      <FieldSelect
        id={name}
        name={name}
        className={css.listingTypeSelect}
        label={intl.formatMessage({ id: 'EditListingDetailsForm.listingTypeLabel' })}
        validate={required(
          intl.formatMessage({ id: 'EditListingDetailsForm.listingTypeRequired' })
        )}
        onChange={handleOnChange}
      >
        <option disabled value="">
          {intl.formatMessage({ id: 'EditListingDetailsForm.listingTypePlaceholder' })}
        </option>
        {listingTypes.map(config => {
          const type = config.listingType;
          return (
            <option key={type} value={type}>
              {config.label}
            </option>
          );
        })}
      </FieldSelect>
      <FieldHidden name="transactionProcessAlias" />
      <FieldHidden name="unitType" />
    </>
  ) : hasMultipleListingTypes && hasExistingListingType ? (
    <div className={css.listingTypeSelect}>
      <Heading as="h5" rootClassName={css.selectedLabel}>
        {intl.formatMessage({ id: 'EditListingDetailsForm.listingTypeLabel' })}
      </Heading>
      <p className={css.selectedValue}>{formApi.getFieldState(name)?.value}</p>
      <FieldHidden name={name} />
      <FieldHidden name="transactionProcessAlias" />
      <FieldHidden name="unitType" />
    </div>
  ) : (
    <>
      <FieldHidden name={name} />
      <FieldHidden name="transactionProcessAlias" />
      <FieldHidden name="unitType" />
    </>
  );
};

// Add collect data for listing fields (both publicData and privateData) based on configuration
const AddListingFields = props => {
  const { listingType, listingFieldsConfig, intl } = props;
  const fields = listingFieldsConfig.reduce((pickedFields, fieldConfig) => {
    const { key, includeForListingTypes, schemaType, scope } = fieldConfig || {};

    const isKnownSchemaType = EXTENDED_DATA_SCHEMA_TYPES.includes(schemaType);
    const isTargetProcessAlias =
      includeForListingTypes == null || includeForListingTypes.includes(listingType);
    const isProviderScope = ['public', 'private'].includes(scope);

    return isKnownSchemaType && isTargetProcessAlias && isProviderScope
      ? [
          ...pickedFields,
          <CustomExtendedDataField
            key={key}
            name={key}
            fieldConfig={fieldConfig}
            defaultRequiredMessage={intl.formatMessage({
              id: 'EditListingDetailsForm.defaultRequiredMessage',
            })}
          />,
        ]
      : pickedFields;
  }, []);

  return <>{fields}</>;
};

// Form that asks title, description, transaction process and unit type for pricing
// In addition, it asks about custom fields according to marketplace-custom-config.js
const EditListingDetailsFormComponent = props => (
  <FinalForm
    {...props}
    mutators={{ ...arrayMutators }}
    render={formRenderProps => {
      const {
        autoFocus,
        className,
        disabled,
        ready,
        formId,
        form: formApi,
        handleSubmit,
        onProcessChange,
        intl,
        invalid,
        pristine,
        selectableListingTypes,
        hasExistingListingType,
        saveActionMsg,
        updated,
        updateInProgress,
        fetchErrors,
        listingFieldsConfig,
        values,
      } = formRenderProps;

      const makeFieldConfig = listingFieldsConfig.find(field => field.key === 'make');
      const sellerTypeFieldConfig = listingFieldsConfig.find(field => field.key === 'seller_type');
      const priceNegotiationFieldConfig = listingFieldsConfig.find(
        field => field.key === 'price_negotiation'
      );
      const bodyTypeFieldConfig = listingFieldsConfig.find(field => field.key === 'body_type');
      const driveTrainFieldConfig = listingFieldsConfig.find(field => field.key === 'drivetrain');
      const transmissionFieldConfig = listingFieldsConfig.find(
        field => field.key === 'transmission'
      );
      const typeOfModificationsFieldConfig = listingFieldsConfig.find(
        field => field.key === 'type_of_modifications'
      );

      const { listingType } = values;

      const titleRequiredMessage = intl.formatMessage({
        id: 'EditListingDetailsForm.titleRequired',
      });
      const maxLengthMessage = intl.formatMessage(
        { id: 'EditListingDetailsForm.maxLength' },
        {
          maxLength: TITLE_MAX_LENGTH,
        }
      );
      const maxLength60Message = maxLength(maxLengthMessage, TITLE_MAX_LENGTH);

      const classes = classNames(css.root, className);
      const submitReady = (updated && pristine) || ready;
      const submitInProgress = updateInProgress;
      const submitDisabled = invalid || disabled || submitInProgress;

      return (
        <Form className={classes} onSubmit={handleSubmit}>
          <ErrorMessage fetchErrors={fetchErrors} />

          <FieldTextInput
            id={`${formId}title`}
            name="title"
            className={css.title}
            type="text"
            label={intl.formatMessage({ id: 'EditListingDetailsForm.title' })}
            placeholder={intl.formatMessage({ id: 'EditListingDetailsForm.titlePlaceholder' })}
            maxLength={TITLE_MAX_LENGTH}
            validate={composeValidators(required(titleRequiredMessage), maxLength60Message)}
            autoFocus={autoFocus}
          />

          <FieldTextInput
            id={`${formId}description`}
            name="description"
            className={css.description}
            type="textarea"
            label={intl.formatMessage({ id: 'EditListingDetailsForm.description' })}
            placeholder={intl.formatMessage({
              id: 'EditListingDetailsForm.descriptionPlaceholder',
            })}
            validate={required(
              intl.formatMessage({
                id: 'EditListingDetailsForm.descriptionRequired',
              })
            )}
          />

          <FieldSelectListingType
            name="listingType"
            listingTypes={selectableListingTypes}
            hasExistingListingType={hasExistingListingType}
            onProcessChange={onProcessChange}
            formApi={formApi}
            intl={intl}
          />

          <CustomExtendedDataField
            id="make"
            name="make"
            fieldConfig={makeFieldConfig}
            defaultRequiredMessage={intl.formatMessage({
              id: 'EditListingDetailsForm.defaultRequiredMessage',
            })}
          />

          {/* <AddListingFields
            listingType={listingType}
            listingFieldsConfig={listingFieldsConfig}
            intl={intl}
          /> */}

          <FieldTextInput
            id="model"
            name="model"
            className={css.title}
            type="text"
            label={intl.formatMessage({ id: 'EditListingDetailsForm.model' })}
            placeholder={intl.formatMessage({ id: 'EditListingDetailsForm.modelPlaceholder' })}
            maxLength={TITLE_MAX_LENGTH}
            validate={required(titleRequiredMessage)}
            autoFocus={autoFocus}
          />

          <FieldTextInput
            id="color"
            name="color"
            className={css.title}
            type="text"
            label={intl.formatMessage({ id: 'EditListingDetailsForm.color' })}
            placeholder={intl.formatMessage({ id: 'EditListingDetailsForm.colorPlaceholder' })}
            maxLength={TITLE_MAX_LENGTH}
            validate={required(titleRequiredMessage)}
            autoFocus={autoFocus}
          />

          <FieldTextInput
            id="year"
            name="year"
            className={css.title}
            type="number"
            label={intl.formatMessage({ id: 'EditListingDetailsForm.year' })}
            placeholder={intl.formatMessage({ id: 'EditListingDetailsForm.yearPlaceholder' })}
            maxLength={TITLE_MAX_LENGTH}
            validate={required(titleRequiredMessage)}
            autoFocus={autoFocus}
          />

          <FieldTextInput
            id="mileage"
            name="mileage"
            className={css.title}
            type="number"
            label={intl.formatMessage({ id: 'EditListingDetailsForm.mileage' })}
            placeholder={intl.formatMessage({ id: 'EditListingDetailsForm.mileagePlaceholder' })}
            maxLength={TITLE_MAX_LENGTH}
            validate={required(titleRequiredMessage)}
            autoFocus={autoFocus}
          />

          <FieldTextInput
            id="vin_code"
            name="vin_code"
            className={css.title}
            type="text"
            label={intl.formatMessage({ id: 'EditListingDetailsForm.vinCode' })}
            placeholder={intl.formatMessage({ id: 'EditListingDetailsForm.vinCodePlaceholder' })}
            maxLength={TITLE_MAX_LENGTH}
            validate={required(titleRequiredMessage)}
            autoFocus={autoFocus}
          />

          <CustomExtendedDataField
            id="seller_type"
            name="seller_type"
            fieldConfig={sellerTypeFieldConfig}
            defaultRequiredMessage={intl.formatMessage({
              id: 'EditListingDetailsForm.defaultRequiredMessage',
            })}
          />

          <CustomExtendedDataField
            id="price_negotiation"
            name="price_negotiation"
            fieldConfig={priceNegotiationFieldConfig}
            defaultRequiredMessage={intl.formatMessage({
              id: 'EditListingDetailsForm.defaultRequiredMessage',
            })}
          />

          <CustomExtendedDataField
            id="body_type"
            name="body_type"
            fieldConfig={bodyTypeFieldConfig}
            defaultRequiredMessage={intl.formatMessage({
              id: 'EditListingDetailsForm.defaultRequiredMessage',
            })}
          />
          <CustomExtendedDataField
            id="drivetrain"
            name="drivetrain"
            fieldConfig={driveTrainFieldConfig}
            defaultRequiredMessage={intl.formatMessage({
              id: 'EditListingDetailsForm.defaultRequiredMessage',
            })}
          />
          <CustomExtendedDataField
            id="transmission"
            name="transmission"
            fieldConfig={transmissionFieldConfig}
            defaultRequiredMessage={intl.formatMessage({
              id: 'EditListingDetailsForm.defaultRequiredMessage',
            })}
          />
          <CustomExtendedDataField
            id="type_of_modifications"
            name="type_of_modifications"
            fieldConfig={typeOfModificationsFieldConfig}
            defaultRequiredMessage={intl.formatMessage({
              id: 'EditListingDetailsForm.defaultRequiredMessage',
            })}
          />

          <FieldTextInput
            id="cubic_capacity"
            name="cubic_capacity"
            className={css.title}
            type="number"
            label={intl.formatMessage({ id: 'EditListingDetailsForm.cubicCapacity' })}
            placeholder={intl.formatMessage({
              id: 'EditListingDetailsForm.cubicCapacityPlaceholder',
            })}
            maxLength={TITLE_MAX_LENGTH}
            validate={required(titleRequiredMessage)}
            autoFocus={autoFocus}
          />

          <FieldTextInput
            id="power"
            name="power"
            className={css.title}
            type="number"
            label={intl.formatMessage({ id: 'EditListingDetailsForm.power' })}
            placeholder={intl.formatMessage({ id: 'EditListingDetailsForm.powerPlaceholder' })}
            maxLength={TITLE_MAX_LENGTH}
            validate={required(titleRequiredMessage)}
            autoFocus={autoFocus}
          />

          <FieldTextInput
            id="modifications"
            name="modifications"
            className={css.title}
            type="text"
            label={intl.formatMessage({ id: 'EditListingDetailsForm.modifications' })}
            placeholder={intl.formatMessage({
              id: 'EditListingDetailsForm.modificationsPlaceholder',
            })}
            maxLength={TITLE_MAX_LENGTH}
            autoFocus={autoFocus}
          />

          <FieldTextInput
            id="equipment"
            name="equipment"
            className={css.title}
            type="text"
            label={intl.formatMessage({ id: 'EditListingDetailsForm.equipment' })}
            placeholder={intl.formatMessage({ id: 'EditListingDetailsForm.equipmentPlaceholder' })}
            maxLength={TITLE_MAX_LENGTH}
            validate={required(titleRequiredMessage)}
            autoFocus={autoFocus}
          />

          <FieldTextInput
            id="recent_service_history"
            name="recent_service_history"
            className={css.title}
            type="text"
            label={intl.formatMessage({ id: 'EditListingDetailsForm.recentServiceHistory' })}
            placeholder={intl.formatMessage({
              id: 'EditListingDetailsForm.recentServiceHistoryPlaceholder',
            })}
            maxLength={TITLE_MAX_LENGTH}
            validate={required(titleRequiredMessage)}
            autoFocus={autoFocus}
          />

          <FieldTextInput
            id="video_links"
            name="video_links"
            className={css.title}
            type="text"
            label={intl.formatMessage({ id: 'EditListingDetailsForm.videoLinks' })}
            placeholder={intl.formatMessage({ id: 'EditListingDetailsForm.videoLinksPlaceholder' })}
            maxLength={TITLE_MAX_LENGTH}
            autoFocus={autoFocus}
          />

          <Button
            className={css.submitButton}
            type="submit"
            inProgress={submitInProgress}
            disabled={submitDisabled}
            ready={submitReady}
          >
            {saveActionMsg}
          </Button>
        </Form>
      );
    }}
  />
);

EditListingDetailsFormComponent.defaultProps = {
  className: null,
  formId: 'EditListingDetailsForm',
  fetchErrors: null,
  onProcessChange: null,
  hasExistingListingType: false,
  listingFieldsConfig: [],
};

EditListingDetailsFormComponent.propTypes = {
  className: string,
  formId: string,
  intl: intlShape.isRequired,
  onSubmit: func.isRequired,
  onProcessChange: func,
  saveActionMsg: string.isRequired,
  disabled: bool.isRequired,
  ready: bool.isRequired,
  updated: bool.isRequired,
  updateInProgress: bool.isRequired,
  fetchErrors: shape({
    createListingDraftError: propTypes.error,
    showListingsError: propTypes.error,
    updateListingError: propTypes.error,
  }),
  selectableListingTypes: arrayOf(
    shape({
      listingType: string.isRequired,
      transactionProcessAlias: string.isRequired,
      unitType: string.isRequired,
    })
  ).isRequired,
  hasExistingListingType: bool,
  listingFieldsConfig: propTypes.listingFieldsConfig,
};

export default compose(injectIntl)(EditListingDetailsFormComponent);
