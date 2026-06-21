/**
 * Airtable to Supabase Migration Script
 *
 * Airtable에 저장된 텍스트 데이터를 Supabase instagram_text_pool로 마이그레이션합니다.
 *
 * 사용 방법:
 * 1. Airtable Personal Access Token 발급: https://airtable.com/create/tokens
 * 2. 환경 변수 설정 또는 코드에 직접 입력
 * 3. npm install airtable (필요시)
 * 4. node api/migrate-airtable.js 실행
 */

import Airtable from 'airtable';
import { supabase } from '../lib/supabase';

// =================================================================================
// 설정: 여기에 Airtable 정보를 입력하세요
// =================================================================================

const AIRTABLE_CONFIG = {
  // Airtable Personal Access Token
  // 발급: https://airtable.com/create/tokens
  apiKey: process.env.AIRTABLE_API_KEY || 'YOUR_AIRTABLE_API_KEY',

  // Base ID (URL에서 확인: https://airtable.com/appXXXXXX/...)
  baseId: process.env.AIRTABLE_BASE_ID || 'YOUR_BASE_ID',

  // Table 이름
  tableName: process.env.AIRTABLE_TABLE_NAME || 'Questions', // 또는 실제 테이블 이름
};

// Supabase User ID (브라우저에서 사용하는 user_id)
const SUPABASE_USER_ID = process.env.SUPABASE_USER_ID || 'browser_default';

// =================================================================================
// 마이그레이션 함수
// =================================================================================

/**
 * Airtable에서 데이터 가져오기
 */
async function fetchFromAirtable() {
  console.log('📥 Airtable에서 데이터 가져오는 중...');

  const base = new Airtable({ apiKey: AIRTABLE_CONFIG.apiKey }).base(AIRTABLE_CONFIG.baseId);

  const records = [];

  return new Promise((resolve, reject) => {
    base(AIRTABLE_CONFIG.tableName)
      .select({
        // maxRecords: 100, // 테스트용: 최대 100개만
        view: 'Grid view', // 또는 실제 view 이름
      })
      .eachPage(
        (pageRecords, fetchNextPage) => {
          records.push(...pageRecords);
          fetchNextPage();
        },
        (error) => {
          if (error) {
            reject(error);
          } else {
            console.log(`✅ Airtable에서 ${records.length}개 레코드 가져옴`);
            resolve(records);
          }
        }
      );
  });
}

/**
 * Airtable 레코드를 Supabase 형식으로 변환
 */
function transformRecord(airtableRecord) {
  const fields = airtableRecord.fields;

  // Airtable 필드 이름에 맞게 조정하세요
  return {
    user_id: SUPABASE_USER_ID,
    text: fields['Question'] || fields['Text'] || fields['질문'] || '',
    caption: fields['Caption'] || fields['캡션'] || undefined,
    category: fields['Category'] || fields['카테고리'] || undefined,
    tags: fields['Tags'] ? (Array.isArray(fields['Tags']) ? fields['Tags'] : [fields['Tags']]) : undefined,
    is_used: fields['Used'] || fields['사용됨'] || false,
    used_at: fields['UsedAt'] || fields['사용일자'] || undefined,
    ai_generated: fields['AI Generated'] || fields['AI생성'] || false,
    prompt: fields['Prompt'] || fields['프롬프트'] || undefined,
  };
}

/**
 * Supabase에 데이터 삽입
 */
async function insertToSupabase(records) {
  console.log('📤 Supabase에 데이터 삽입 중...');

  if (!supabase) {
    throw new Error('Supabase가 초기화되지 않았습니다.');
  }

  // 배치로 삽입 (한 번에 100개씩)
  const batchSize = 100;
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    try {
      const { data, error } = await supabase
        .from('instagram_text_pool')
        .insert(batch)
        .select();

      if (error) {
        console.error(`❌ 배치 ${Math.floor(i / batchSize) + 1} 삽입 실패:`, error);
        failed += batch.length;
      } else {
        inserted += data.length;
        console.log(`✅ 배치 ${Math.floor(i / batchSize) + 1}: ${data.length}개 삽입 완료`);
      }
    } catch (err) {
      console.error(`❌ 배치 ${Math.floor(i / batchSize) + 1} 오류:`, err);
      failed += batch.length;
    }
  }

  return { inserted, failed };
}

/**
 * 메인 마이그레이션 함수
 */
async function migrate() {
  console.log('🚀 Airtable → Supabase 마이그레이션 시작\n');

  try {
    // 1. Airtable에서 데이터 가져오기
    const airtableRecords = await fetchFromAirtable();

    if (airtableRecords.length === 0) {
      console.log('⚠️  Airtable에 데이터가 없습니다.');
      return;
    }

    // 2. 데이터 변환
    console.log('🔄 데이터 변환 중...');
    const transformedRecords = airtableRecords
      .map(transformRecord)
      .filter((record) => record.text); // 텍스트가 있는 것만

    console.log(`✅ ${transformedRecords.length}개 레코드 변환 완료\n`);

    // 3. Supabase에 삽입
    const result = await insertToSupabase(transformedRecords);

    // 4. 결과 출력
    console.log('\n📊 마이그레이션 완료!');
    console.log(`   - 총 레코드: ${airtableRecords.length}`);
    console.log(`   - 변환됨: ${transformedRecords.length}`);
    console.log(`   - 삽입 성공: ${result.inserted}`);
    console.log(`   - 실패: ${result.failed}`);

    if (result.failed > 0) {
      console.log('\n⚠️  일부 레코드 삽입에 실패했습니다. 로그를 확인하세요.');
    }
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    throw error;
  }
}

// =================================================================================
// 스크립트 실행
// =================================================================================

// CLI에서 실행 시
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('\n✅ 완료!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 오류:', error);
      process.exit(1);
    });
}

// 모듈로 사용 시
export { migrate, fetchFromAirtable, transformRecord, insertToSupabase };
