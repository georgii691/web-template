import React from 'react';
import { FormattedMessage } from '../../util/reactIntl';
import { Heading } from '../../components';

import css from './ListingPage.module.css';

const SectionDetailsMaybe = props => {
  const { publicData, metadata = {}, listingConfig, intl } = props;
  const { listingFields } = listingConfig || {};
  console.log(publicData);

  if (!publicData || !listingConfig) {
    return null;
  }

  const pickListingFields = (filteredConfigs, config) => {
    const { key, schemaType, enumOptions, showConfig = {} } = config;
    const { isDetail, label } = showConfig;
    const publicDataValue = publicData[key];
    const metadataValue = metadata[key];
    const value = publicDataValue || metadataValue;

    if (isDetail && typeof value !== 'undefined') {
      const findSelectedOption = enumValue => enumOptions?.find(o => enumValue === `${o.option}`);
      const getBooleanMessage = value =>
        value
          ? intl.formatMessage({ id: 'SearchPage.detailYes' })
          : intl.formatMessage({ id: 'SearchPage.detailNo' });
      const optionConfig = findSelectedOption(value);

      return schemaType === 'enum'
        ? filteredConfigs.concat({ key, value: optionConfig?.label, label })
        : schemaType === 'boolean'
        ? filteredConfigs.concat({ key, value: getBooleanMessage(value), label })
        : schemaType === 'long'
        ? filteredConfigs.concat({ key, value, label })
        : filteredConfigs;
    }
    return filteredConfigs;
  };

  const existingListingFields = listingFields.reduce(pickListingFields, []);

  return existingListingFields.length > 0 ? (
    <div className={css.sectionDetails}>
      <Heading as="h2" rootClassName={css.sectionHeading}>
        <FormattedMessage id="ListingPage.detailsTitle" />
      </Heading>
      <ul className={css.details}>
        {existingListingFields.map(detail => (
          <li key={detail.key} className={css.detailsRow}>
            <span className={css.detailLabel}>{detail.label}</span>
            <span>{detail.value}</span>
          </li>
        ))}
        <li key={'model'} className={css.detailsRow}>
          <span className={css.detailLabel}>{'Model'}</span>
          <span>{publicData?.model}</span>
        </li>
        <li key={'color'} className={css.detailsRow}>
          <span className={css.detailLabel}>{'Color'}</span>
          <span>{publicData?.color}</span>
        </li>
        <li key={'year'} className={css.detailsRow}>
          <span className={css.detailLabel}>{'Year'}</span>
          <span>{publicData?.year}</span>
        </li>
        <li key={'mileage'} className={css.detailsRow}>
          <span className={css.detailLabel}>{'Mileage'}</span>
          <span>{publicData?.mileage}</span>
        </li>
        <li key={'vin_code'} className={css.detailsRow}>
          <span className={css.detailLabel}>{'VIN Code'}</span>
          <span>{publicData?.vin_code}</span>
        </li>
        <li key={'cubic_capacity'} className={css.detailsRow}>
          <span className={css.detailLabel}>{'Cubic Capacity'}</span>
          <span>{publicData?.cubic_capacity}</span>
        </li>
        <li key={'power'} className={css.detailsRow}>
          <span className={css.detailLabel}>{'Power (HP)'}</span>
          <span>{publicData?.power}</span>
        </li>
      </ul>
    </div>
  ) : null;
};

export default SectionDetailsMaybe;
